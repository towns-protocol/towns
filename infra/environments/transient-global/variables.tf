# variable "datadog_api_key" {
#   description = "Datadog API key"
# }

# variable "datadog_app_key" {
#   description = "Datadog APP key"
# }

variable "cloudflare_terraform_api_token" {
  description = "Cloudflare API token"
  type        = string
  validation {
    condition     = var.cloudflare_terraform_api_token != ""
    error_message = "The cloudflare api token cannot be empty."
  }
}
