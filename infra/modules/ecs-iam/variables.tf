variable "environment" {
  description = "The environment to deploy to, used for tagging"
  type        = string
  validation {
    condition     = var.environment != ""
    error_message = "The environment cannot be empty."
  }
}