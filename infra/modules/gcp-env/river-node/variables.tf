variable "google_service_account" {
  type = object({
    member = string
    email  = string
  })
}

variable "project_id" {
  type = string
}

variable "node_config" {
  type = object({
    num_stream_nodes  = number
    num_archive_nodes = number
    min_db_cpu_count  = number
  })
}

variable "region" {
  type = string
}

variable "network" {
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
