resource "upcloud_network" "wappregator" {
  name = "${var.cluster_name}-network"
  zone = var.zone

  ip_network {
    address = var.network_cidr
    dhcp    = true
    family  = "IPv4"
  }

  lifecycle {
    ignore_changes = [router]
  }
}

resource "upcloud_kubernetes_cluster" "wappregator" {
  name    = var.cluster_name
  zone    = var.zone
  plan    = var.k8s_plan
  network = upcloud_network.wappregator.id

  control_plane_ip_filter = [
    "0.0.0.0/0"
  ] # TODO: Set this to GitHub Actions IPs
}

resource "upcloud_kubernetes_node_group" "workers" {
  for_each = var.k8s_nodes

  cluster    = upcloud_kubernetes_cluster.wappregator.id
  name       = "${var.cluster_name}-workers"
  plan       = each.key
  node_count = each.value
}
