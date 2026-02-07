locals {
  common_labels = {
    app = "wappregator"
  }

  valkey_labels = merge(local.common_labels, {
    component = "valkey"
  })

  backend_labels = merge(local.common_labels, {
    component = "backend"
  })

  pollers_labels = merge(local.common_labels, {
    component = "pollers"
  })

  frontend_labels = merge(local.common_labels, {
    component = "frontend"
  })

  container_repository = "ghcr.io/laitalaj"

  letsencrypt_server      = var.use_prod_letsencrypt ? "https://acme-v02.api.letsencrypt.org/directory" : "https://acme-staging-v02.api.letsencrypt.org/directory"
  letsencrypt_secret_name = var.use_prod_letsencrypt ? "letsencrypt-account-prod" : "letsencrypt-account-staging"
  tls_secret_name         = var.use_prod_letsencrypt ? "wappregator-tls" : "wappregator-tls-staging"

  hosts = [var.domain, "www.${var.domain}"]
}

resource "kubernetes_namespace_v1" "wappregator" {
  metadata {
    name   = var.k8s_namespace
    labels = local.common_labels
  }
}

resource "kubernetes_deployment_v1" "valkey" {
  metadata {
    name      = "valkey"
    namespace = kubernetes_namespace_v1.wappregator.metadata[0].name
    labels    = local.valkey_labels
  }

  spec {
    replicas = 1

    selector {
      match_labels = local.valkey_labels
    }

    template {
      metadata {
        labels = local.valkey_labels
      }

      spec {
        container {
          name  = "valkey"
          image = "docker.io/valkey/valkey-bundle:${var.valkey_image_tag}"

          port {
            container_port = 6379
            protocol       = "TCP"
          }

          resources {
            requests = {
              cpu    = var.valkey_cpu_request
              memory = var.valkey_memory_request
            }
            limits = {
              memory = var.valkey_memory_limit
            }
          }

          liveness_probe {
            exec {
              command = ["valkey-cli", "ping"]
            }
            initial_delay_seconds = var.probe_interval_seconds
            period_seconds        = var.probe_interval_seconds
          }

          readiness_probe {
            exec {
              command = ["valkey-cli", "ping"]
            }
            initial_delay_seconds = var.probe_interval_seconds
            period_seconds        = var.probe_interval_seconds
          }
        }
      }
    }
  }
}

resource "kubernetes_service_v1" "valkey" {
  metadata {
    name      = "valkey"
    namespace = kubernetes_namespace_v1.wappregator.metadata[0].name
    labels    = local.valkey_labels
  }

  spec {
    selector = local.valkey_labels

    port {
      port        = 6379
      target_port = 6379
      protocol    = "TCP"
    }

    type = "ClusterIP"
  }
}

resource "kubernetes_deployment_v1" "backend" {
  metadata {
    name      = "backend"
    namespace = kubernetes_namespace_v1.wappregator.metadata[0].name
    labels    = local.backend_labels
  }

  spec {
    replicas = var.backend_replicas

    selector {
      match_labels = local.backend_labels
    }

    template {
      metadata {
        labels = local.backend_labels
      }

      spec {
        container {
          name  = "backend"
          image = "${local.container_repository}/wappregator-backend:${var.backend_image_tag}"

          port {
            container_port = var.backend_port
            protocol       = "TCP"
          }

          env {
            name  = "VALKEY_URL"
            value = "valkey://${kubernetes_service_v1.valkey.metadata[0].name}:6379"
          }

          resources {
            requests = {
              cpu    = var.backend_cpu_request
              memory = var.backend_memory_request
            }
            limits = {
              memory = var.backend_memory_limit
            }
          }

          liveness_probe {
            http_get {
              path = "/health/live"
              port = var.backend_port
            }
            initial_delay_seconds = var.probe_interval_seconds
            period_seconds        = var.probe_interval_seconds
          }

          readiness_probe {
            http_get {
              path = "/health/ready"
              port = var.backend_port
            }
            initial_delay_seconds = var.probe_interval_seconds
            period_seconds        = var.probe_interval_seconds
          }
        }
      }
    }
  }
}

resource "kubernetes_service_v1" "backend" {
  metadata {
    name      = "backend"
    namespace = kubernetes_namespace_v1.wappregator.metadata[0].name
    labels    = local.backend_labels
  }

  spec {
    selector = local.backend_labels

    port {
      port        = var.backend_port
      target_port = var.backend_port
      protocol    = "TCP"
    }

    type = "ClusterIP"
  }
}


resource "kubernetes_deployment_v1" "pollers" {
  metadata {
    name      = "pollers"
    namespace = kubernetes_namespace_v1.wappregator.metadata[0].name
    labels    = local.pollers_labels
  }

  spec {
    replicas = 1

    selector {
      match_labels = local.pollers_labels
    }

    template {
      metadata {
        labels = local.pollers_labels
      }

      spec {
        container {
          name  = "pollers"
          image = "${local.container_repository}/wappregator-pollers:${var.pollers_image_tag}"

          env {
            name  = "VALKEY_URL"
            value = "valkey://${kubernetes_service_v1.valkey.metadata[0].name}:6379"
          }

          resources {
            requests = {
              cpu    = var.pollers_cpu_request
              memory = var.pollers_memory_request
            }
            limits = {
              memory = var.pollers_memory_limit
            }
          }

          liveness_probe {
            exec {
              command = ["sh", "-c", "[ $(( $(date +%s) - $(cat /tmp/heartbeat) )) -lt ${var.probe_interval_seconds} ]"]
            }
            initial_delay_seconds = var.probe_interval_seconds
            period_seconds        = var.probe_interval_seconds
          }

          readiness_probe {
            exec {
              command = ["test", "-f", "/tmp/ready"]
            }
            initial_delay_seconds = var.probe_interval_seconds
            period_seconds        = var.probe_interval_seconds
          }
        }
      }
    }
  }
}

resource "kubernetes_deployment_v1" "frontend" {
  metadata {
    name      = "frontend"
    namespace = kubernetes_namespace_v1.wappregator.metadata[0].name
    labels    = local.frontend_labels
  }

  spec {
    replicas = var.frontend_replicas

    selector {
      match_labels = local.frontend_labels
    }

    template {
      metadata {
        labels = local.frontend_labels
      }

      spec {
        container {
          name  = "frontend"
          image = "${local.container_repository}/wappregator-frontend:${var.frontend_image_tag}"

          port {
            container_port = var.frontend_port
            protocol       = "TCP"
          }

          resources {
            requests = {
              cpu    = var.frontend_cpu_request
              memory = var.frontend_memory_request
            }
            limits = {
              memory = var.frontend_memory_limit
            }
          }

          liveness_probe {
            http_get {
              path = "/"
              port = var.frontend_port
            }
            initial_delay_seconds = var.probe_interval_seconds
            period_seconds        = var.probe_interval_seconds
          }

          readiness_probe {
            http_get {
              path = "/"
              port = var.frontend_port
            }
            initial_delay_seconds = var.probe_interval_seconds
            period_seconds        = var.probe_interval_seconds
          }
        }
      }
    }
  }
}

resource "kubernetes_service_v1" "frontend" {
  metadata {
    name      = "frontend"
    namespace = kubernetes_namespace_v1.wappregator.metadata[0].name
    labels    = local.frontend_labels
  }

  spec {
    selector = local.frontend_labels

    port {
      port        = var.frontend_port
      target_port = var.frontend_port
      protocol    = "TCP"
    }

    type = "ClusterIP"
  }
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
