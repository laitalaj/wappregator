locals {
  letsencrypt_server      = var.use_prod_letsencrypt ? "https://acme-v02.api.letsencrypt.org/directory" : "https://acme-staging-v02.api.letsencrypt.org/directory"
  letsencrypt_secret_name = var.use_prod_letsencrypt ? "letsencrypt-account-prod" : "letsencrypt-account-staging"
  tls_secret_name         = var.use_prod_letsencrypt ? "wappregator-tls" : "wappregator-tls-staging"

  hosts = [var.domain, "www.${var.domain}"]
}

resource "helm_release" "cert_manager" {
  name             = "cert-manager"
  repository       = "oci://quay.io/jetstack/charts"
  chart            = "cert-manager"
  version          = var.cert_manager_version
  namespace        = "cert-manager"
  create_namespace = true

  set = [{
    name  = "crds.enabled"
    value = true
  }]

  values = [
    yamlencode({
      crds = {
        enabled = true
      }
      config = {
        apiVersion       = "controller.config.cert-manager.io/v1alpha1"
        kind             = "ControllerConfiguration"
        enableGatewayAPI = true
      }
    })
  ]
}

# Can't use kubernetes_manifest as CRD existence is checked at plan time,
# and cert-manager CRDs aren't there until apply time.
# See https://github.com/hashicorp/terraform-provider-kubernetes/issues/1367
resource "kubectl_manifest" "letsencrypt_issuer" {
  depends_on = [helm_release.cert_manager]

  yaml_body = yamlencode({
    apiVersion = "cert-manager.io/v1"
    kind       = "ClusterIssuer"
    metadata = {
      name = "letsencrypt"
    }
    spec = {
      acme = {
        server = local.letsencrypt_server
        email  = var.letsencrypt_email
        privateKeySecretRef = {
          name = local.letsencrypt_secret_name
        }
        solvers = [
          {
            http01 = {
              gatewayHTTPRoute = {
                parentRefs = [{
                  name      = "wappregator"
                  namespace = kubernetes_namespace_v1.wappregator.metadata[0].name
                  kind      = "Gateway"
                }]
              }
            }
          }
        ]
      }
    }
  })
}

data "http" "gateway_api_crds" {
  url = "https://github.com/kubernetes-sigs/gateway-api/releases/download/${var.gateway_api_version}/standard-install.yaml"
}

resource "kubectl_manifest" "gateway_api_crds" {
  yaml_body        = data.http.gateway_api_crds.response_body
  sensitive_fields = ["spec"] # The CRD yaml is very long, so mark the whole spec as sensitive to hide it from plan output
}

resource "helm_release" "cilium" {
  name            = "cilium"
  repository      = "https://helm.cilium.io"
  chart           = "cilium"
  namespace       = "kube-system"
  upgrade_install = true # Cilium exists on a fresh Upcloud K8s - this adopts it into our TF state
  recreate_pods   = true # Needs to be done to pick up the Gateway API CRDs

  values = [
    yamlencode({
      gatewayAPI = {
        enabled = true
      }
      operator = {
        replicas = sum(values(var.k8s_nodes)) > 1 ? 2 : 1
      }

      # Values below copied from the initial state of Cilium in an Upcloud managed K8s.
      # Needs to be done like this for the upgrade_install to work correctly (reuse_values doesn't seem to work here),
      # which in turn is needed to adopt the Cilium release into our TF state without needing manual actions
      ipam = {
        mode = "cluster-pool"
        operator = {
          clusterPoolIPv4PodCIDRList = ["192.168.0.0/16"]
        }
      }
      k8sServiceHost       = "auto"
      k8sServicePort       = 6443
      kubeProxyReplacement = true
    })
  ]

  depends_on = [kubectl_manifest.gateway_api_crds]
}

resource "kubectl_manifest" "cilium_gateway" {
  yaml_body = yamlencode({
    apiVersion = "gateway.networking.k8s.io/v1"
    kind       = "Gateway"
    metadata = {
      name      = "wappregator"
      namespace = kubernetes_namespace_v1.wappregator.metadata[0].name
      annotations = {
        "cert-manager.io/cluster-issuer" = kubectl_manifest.letsencrypt_issuer.name
      }
    }
    spec = {
      gatewayClassName = helm_release.cilium.name
      infrastructure = {
        annotations = { # https://upcloud.com/docs/guides/gateway-api-migration/#customizing-load-balancer-configuration-with-gateway-api
          "service.beta.kubernetes.io/upcloud-load-balancer-config" = jsonencode({
            plan = var.lb_plan,
            frontends = [
              {
                name = "port-80"
                mode = "tcp"
                port = 80
              },
              {
                name = "port-443"
                mode = "tcp"
                port = 443
              }
            ]
          })
        }
      }
      listeners = flatten([
        # Explicit hosts are required for cert-manager to be able to do HTTP01
        for idx, host in local.hosts : [
          {
            name     = "http-${idx}"
            hostname = host
            protocol = "HTTP"
            port     = 80
            allowedRoutes = {
              namespaces = {
                from = "All"
              }
            }
          },
          {
            name     = "https-${idx}"
            hostname = host
            protocol = "HTTPS"
            port     = 443
            allowedRoutes = {
              namespaces = {
                from = "Same"
              }
            }
            tls = {
              mode = "Terminate"
              certificateRefs = [{
                name = local.tls_secret_name
              }]
            }
          }
        ]
      ])
    }
  })

  wait_for {
    # Wait for UpCloud to set up the LB so that we can get do DNS
    field {
      key        = "status.addresses.[0].value" # https://github.com/thedevsaddam/gojsonq/wiki/Queries#findpath
      value_type = "regex"
      value      = ".+"
    }
  }
}

resource "kubectl_manifest" "wappregator_http_redirect" {
  depends_on = [kubectl_manifest.cilium_gateway]

  yaml_body = yamlencode({
    apiVersion = "gateway.networking.k8s.io/v1"
    kind       = "HTTPRoute"
    metadata = {
      name      = "wappregator-http-redirect"
      namespace = kubernetes_namespace_v1.wappregator.metadata[0].name
    }
    spec = {
      parentRefs = [
        for idx in range(length(local.hosts)) : {
          name        = "wappregator"
          sectionName = "http-${idx}"
        }
      ]
      rules = [
        {
          filters = [{
            type = "RequestRedirect"
            requestRedirect = {
              scheme     = "https"
              statusCode = 301
            }
          }]
        }
      ]
    }
  })
}

resource "kubectl_manifest" "wappregator_httproute" {
  depends_on = [kubectl_manifest.cilium_gateway]

  yaml_body = yamlencode({
    apiVersion = "gateway.networking.k8s.io/v1"
    kind       = "HTTPRoute"
    metadata = {
      name      = "wappregator"
      namespace = kubernetes_namespace_v1.wappregator.metadata[0].name
    }
    spec = {
      parentRefs = [
        for idx in range(length(local.hosts)) : {
          name        = "wappregator"
          sectionName = "https-${idx}"
        }
      ]
      rules = [
        {
          matches = [{
            path = {
              type  = "PathPrefix"
              value = "/api"
            }
          }]
          filters = [{
            type = "URLRewrite"
            urlRewrite = {
              path = {
                type               = "ReplacePrefixMatch"
                replacePrefixMatch = "/"
              }
            }
          }]
          backendRefs = [{
            name = kubernetes_service_v1.backend.metadata[0].name
            port = var.backend_port
          }]
        },
        {
          matches = [{
            path = {
              type  = "PathPrefix"
              value = "/"
            }
          }]
          backendRefs = [{
            name = kubernetes_service_v1.frontend.metadata[0].name
            port = var.frontend_port
          }]
        }
      ]
    }
  })
}
