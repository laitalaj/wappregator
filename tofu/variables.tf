variable "zone" {
  description = "UpCloud zone for the cluster"
  type        = string
  default     = "fi-hel1"
}

variable "cluster_name" {
  description = "Name of the Kubernetes cluster"
  type        = string
  default     = "wappregator-k8s"
}

variable "domain" {
  description = "Domain name for the application"
  type        = string
  default     = "wappregat.org"
}

variable "k8s_plan" {
  description = "UpCloud Kubernetes cluster plan"
  type        = string
  default     = "dev-md"
}

variable "k8s_nodes" {
  description = "Node configuration for the Kubernetes cluster"
  type        = map(number)
  default = {
    # Can't use DEV plans here ;__;
    "CLOUDNATIVE-2xCPU-4GB" = 1
  }
}

variable "lb_plan" {
  description = "UpCloud load balancer plan"
  type        = string
  default     = "essentials"
}

variable "network_cidr" {
  description = "CIDR block for the UpCloud network"
  type        = string
  default     = "172.16.0.0/24"
}

variable "k8s_namespace" {
  description = "Kubernetes namespace for the application"
  type        = string
  default     = "wappregator"
}

variable "probe_interval_seconds" {
  description = "Interval seconds for liveness and readiness probes"
  type        = number
  default     = 30
}

variable "frontend_image_tag" {
  description = "Docker image tag for frontend"
  type        = string
  default     = "latest"
}

variable "backend_image_tag" {
  description = "Docker image tag for backend"
  type        = string
  default     = "latest"
}

variable "pollers_image_tag" {
  description = "Docker image tag for pollers"
  type        = string
  default     = "latest"
}

variable "valkey_image_tag" {
  description = "Docker image tag for valkey"
  type        = string
  default     = "8-alpine"
}

variable "frontend_replicas" {
  description = "Number of frontend replicas"
  type        = number
  default     = 1
}

variable "backend_replicas" {
  description = "Number of backend replicas"
  type        = number
  default     = 1
}

variable "frontend_port" {
  description = "Frontend service port"
  type        = number
  default     = 3000
}

variable "backend_port" {
  description = "Backend service port"
  type        = number
  default     = 8000
}

variable "valkey_cpu_request" {
  description = "CPU request for valkey"
  type        = string
  default     = "50m"
}

variable "valkey_memory_request" {
  description = "Memory request for valkey"
  type        = string
  default     = "128Mi"
}

variable "valkey_memory_limit" {
  description = "Memory limit for valkey"
  type        = string
  default     = "256Mi"
}

variable "backend_cpu_request" {
  description = "CPU request for backend"
  type        = string
  default     = "200m"
}

variable "backend_memory_request" {
  description = "Memory request for backend"
  type        = string
  default     = "256Mi"
}

variable "backend_memory_limit" {
  description = "Memory limit for backend"
  type        = string
  default     = "512Mi"
}

variable "pollers_cpu_request" {
  description = "CPU request for pollers"
  type        = string
  default     = "100m"
}

variable "pollers_memory_request" {
  description = "Memory request for pollers"
  type        = string
  default     = "256Mi"
}

variable "pollers_memory_limit" {
  description = "Memory limit for pollers"
  type        = string
  default     = "512Mi"
}

variable "frontend_cpu_request" {
  description = "CPU request for frontend"
  type        = string
  default     = "50m"
}

variable "frontend_memory_request" {
  description = "Memory request for frontend"
  type        = string
  default     = "64Mi"
}

variable "frontend_memory_limit" {
  description = "Memory limit for frontend"
  type        = string
  default     = "128Mi"
}
