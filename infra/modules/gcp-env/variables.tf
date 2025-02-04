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

variable "notifications_service_migration_config" {
  description = "Migration configuration for the notification service"
  type = object({
    container_provider : string
    rds_public_access : bool
  })

  default = {
    container_provider = "aws"
    rds_public_access  = false
  }
}
