variable "cloudflare_terraform_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
  validation {
    condition     = var.cloudflare_terraform_api_token != ""
    error_message = "The cloudflare api token cannot be empty."
  }
}

variable "datadog_api_key" {
  description = "Datadog API key"
  sensitive   = true
}

variable "datadog_app_key" {
  description = "Datadog APP key"
  sensitive   = true
}

variable "git_pr_number" {
  description = "The GitHub Pull Request number"
  type        = number
  validation {
    condition     = var.git_pr_number != 0
    error_message = "The PR number cannot be 0."
  }
}
