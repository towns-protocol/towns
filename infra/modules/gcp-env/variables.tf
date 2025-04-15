variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "zones" {
  type = list(string)
}

variable "cloudflare_terraform_api_token" {
  description = "Cloudflare API token"
  sensitive   = true
  type        = string
}

variable "gcloud_credentials" {
  description = "Credentials for GCP"
  sensitive   = true
  type        = string
}

variable "river_node_config" {
  type = object({
    num_stream_nodes  = number
    num_archive_nodes = number
    min_db_cpu_count  = number
  })
}

variable "datadog_api_key" {
  type      = string
  sensitive = true
}
