# The hostname isn't included in the kubectl_manifest attributes, so we'll need to dig it out from the service that the Gateway creates.
data "kubernetes_service_v1" "gw_lb" {
  metadata {
    name      = "${helm_release.cilium.name}-gateway-${kubectl_manifest.cilium_gateway.name}"
    namespace = kubernetes_namespace_v1.wappregator.metadata[0].name
  }
}

locals {
  lb_hostname = "${data.kubernetes_service_v1.gw_lb.status[0].load_balancer[0].ingress[0].hostname}."
}

resource "gandi_livedns_record" "root" {
  zone   = var.domain
  name   = "@"
  type   = "ALIAS"
  ttl    = 300
  values = [local.lb_hostname]
}

resource "gandi_livedns_record" "www" {
  zone   = var.domain
  name   = "www"
  type   = "CNAME"
  ttl    = 300
  values = [local.lb_hostname]
}
