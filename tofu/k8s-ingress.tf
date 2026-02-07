locals {
  letsencrypt_server      = var.use_prod_letsencrypt ? "https://acme-v02.api.letsencrypt.org/directory" : "https://acme-staging-v02.api.letsencrypt.org/directory"
  letsencrypt_secret_name = var.use_prod_letsencrypt ? "letsencrypt-account-prod" : "letsencrypt-account-staging"
  tls_secret_name         = var.use_prod_letsencrypt ? "wappregator-tls" : "wappregator-tls-staging"

  hosts = [var.domain, "www.${var.domain}"]
}

resource "helm_release" "nginx_ingress" {
  name             = "ingress-nginx"
  repository       = "https://kubernetes.github.io/ingress-nginx"
  chart            = "ingress-nginx"
  namespace        = "ingress-nginx"
  create_namespace = true

  values = [ # https://upcloud.com/docs/guides/expose-services-through-ingress-nginx-cert-manager/#installing-ingress-nginx + sets the plan to essentials for free LB
    yamlencode({
      controller = {
        service = {
          annotations = {
            "service.beta.kubernetes.io/upcloud-load-balancer-config" = jsonencode({
              plan = var.lb_plan,
              frontends = [
                {
                  name = "http",
                  mode = "tcp",
                },
                {
                  name = "https",
                  mode = "tcp",
                }
              ],
              backends = [
                {
                  name       = "http",
                  properties = { outbound_proxy_protocol = "v2" },
                },
                {
                  name       = "https",
                  properties = { outbound_proxy_protocol = "v2" },
                }
              ]
            })
          }
        },
        config = {
          use-forwarded-headers      = "true",
          compute-full-forwarded-for = "true",
          use-proxy-protocol         = "true",
          real-ip-header             = "proxy_protocol",
        }
      }
    })
  ]
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
        solvers = [{
          http01 = {
            ingress = {
              ingressClassName = "nginx"
            }
          }
        }]
      }
    }
  })
}

resource "kubernetes_ingress_v1" "wappregator" {
  depends_on             = [helm_release.nginx_ingress]
  wait_for_load_balancer = true

  metadata {
    name      = "wappregator"
    namespace = kubernetes_namespace_v1.wappregator.metadata[0].name
    labels    = local.common_labels
    annotations = {
      "nginx.ingress.kubernetes.io/use-regex"      = "true"
      "nginx.ingress.kubernetes.io/rewrite-target" = "/$2"
      "nginx.ingress.kubernetes.io/ssl-redirect"   = "true"
      "cert-manager.io/cluster-issuer"             = kubectl_manifest.letsencrypt_issuer.name
    }
  }

  spec {
    ingress_class_name = "nginx"

    tls {
      secret_name = local.tls_secret_name
      hosts       = local.hosts
    }

    dynamic "rule" {
      for_each = local.hosts
      content {
        host = rule.value

        http {
          path {
            path = "/api(/|$)(.*)"
            backend {
              service {
                name = kubernetes_service_v1.backend.metadata[0].name
                port {
                  number = var.backend_port
                }
              }
            }
          }

          path {
            path = "/((.*))"
            backend {
              service {
                name = kubernetes_service_v1.frontend.metadata[0].name
                port {
                  number = var.frontend_port
                }
              }
            }
          }
        }
      }
    }
  }
}
