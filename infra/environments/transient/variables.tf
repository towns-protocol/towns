# variable "datadog_api_key" {
#   description = "Datadog API key"
# }

# variable "datadog_app_key" {
#   description = "Datadog APP key"
# }

variable "cloudflare_terraform_api_token" {
  description = "Cloudflare API token"
  type = string
  validation {
    condition     = var.cloudflare_terraform_api_token != ""
    error_message = "The cloudflare api token cannot be empty."
  }
}

variable "preview_app_cname_record_name" {
  description = "Preview app CNAME record name"
  type = string
  validation {
    condition     = var.preview_app_cname_record_name != ""
    error_message = "Preview app CNAME record name cannot be empty."
  }
}

variable "preview_app_cname_record_value" {
  description = "Preview app CNAME record value"
  type = string
  validation {
    condition     = var.preview_app_cname_record_value != ""
    error_message = "Preview app CNAME record value cannot be empty."
  }
}