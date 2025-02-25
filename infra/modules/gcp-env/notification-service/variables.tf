variable "google_service_account" {
  type = object({
    member = string
    email  = string
  })
}

variable "project_id" {
  type = string
}

variable "network" {
  type = string
}

variable "region" {
  type = string
}

variable "k8s_subnet_cidr" {
  description = "The CIDR block of the subnet where the GKE cluster is deployed"
  type        = string
}

variable "private_vpc_connection" {
  description = "The private VPC connection to the GCP network"
  type        = any
}
