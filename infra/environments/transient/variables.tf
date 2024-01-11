variable "cloudflare_terraform_api_token" {
  description = "Cloudflare API token"
  type        = string
  validation {
    condition     = var.cloudflare_terraform_api_token != ""
    error_message = "The cloudflare api token cannot be empty."
  }
}

variable "datadog_api_key" {
  description = "Datadog API key"
}

variable "datadog_app_key" {
  description = "Datadog APP key"
}

variable "git_pr_number" {
  description = "The GitHub Pull Request number"
  type        = number
  validation {
    condition     = var.git_pr_number != 0
    error_message = "The PR number cannot be 0."
  }
}

variable "num_nodes" {
  description = "Number of nodes to create"
  type        = number
  default     = 1
}

variable "is_clean_environment" {
  description = "Flag used to determine whether clone db, fork chain block number etc"
  type        = bool
  default     = false
}

variable "river_node_log_level" {
  description = "The log level for the river node (e.g debug, info, warn, error)"
  type        = string
  default     = "info"
}
