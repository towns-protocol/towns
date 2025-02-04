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
