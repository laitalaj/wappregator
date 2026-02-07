locals {
  lb_hostname = "${kubernetes_ingress_v1.wappregator.status[0].load_balancer[0].ingress[0].hostname}."
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

