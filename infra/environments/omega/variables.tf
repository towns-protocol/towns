variable "datadog_api_key" {
  description = "Datadog API key"
  sensitive   = true
}

variable "datadog_app_key" {
  description = "Datadog APP key"
  sensitive   = true
}

variable "cloudflare_terraform_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}
