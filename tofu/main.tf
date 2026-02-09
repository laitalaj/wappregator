terraform {
  required_version = ">= 1.11.0"

  backend "s3" {
    endpoint                    = "https://79p20.upcloudobjects.com"
    bucket                      = "tf-state"
    key                         = "tofu.tfstate"
    region                      = "required-but-ignored"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    force_path_style            = true
    # Uses AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY from environment
  }

  required_providers {
    upcloud = {
      source  = "UpCloudLtd/upcloud"
      version = "~> 5.33"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 3.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 3.1"
    }
    gandi = {
      source  = "go-gandi/gandi"
      version = "~> 2.3"
    }
    # Needed because for some reason the Kubernetes provider can't handle adding CRDs and resources that use those in the same apply.name = {
    # Bit of a pain!
    kubectl = {
      source  = "alekc/kubectl"
      version = "~> 2.1"
    }
    http = {
      source  = "hashicorp/http"
      version = "~> 3.5"
    }
  }
}

provider "upcloud" {
  # Uses UPCLOUD_USERNAME and UPCLOUD_PASSWORD from environment
}

data "upcloud_kubernetes_cluster" "wappregator" { # The resource outputs don't seem to contain all we need
  id = upcloud_kubernetes_cluster.wappregator.id
}

provider "kubernetes" {
  host                   = data.upcloud_kubernetes_cluster.wappregator.host
  client_certificate     = data.upcloud_kubernetes_cluster.wappregator.client_certificate
  client_key             = data.upcloud_kubernetes_cluster.wappregator.client_key
  cluster_ca_certificate = data.upcloud_kubernetes_cluster.wappregator.cluster_ca_certificate
}

provider "kubectl" {
  host                   = data.upcloud_kubernetes_cluster.wappregator.host
  client_certificate     = data.upcloud_kubernetes_cluster.wappregator.client_certificate
  client_key             = data.upcloud_kubernetes_cluster.wappregator.client_key
  cluster_ca_certificate = data.upcloud_kubernetes_cluster.wappregator.cluster_ca_certificate
  load_config_file       = false
}

provider "helm" {
  kubernetes = {
    host                   = data.upcloud_kubernetes_cluster.wappregator.host
    client_certificate     = data.upcloud_kubernetes_cluster.wappregator.client_certificate
    client_key             = data.upcloud_kubernetes_cluster.wappregator.client_key
    cluster_ca_certificate = data.upcloud_kubernetes_cluster.wappregator.cluster_ca_certificate
  }
}

provider "gandi" {
  # Uses GANDI_PERSONAL_ACCESS_TOKEN from environment
}
