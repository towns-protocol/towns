variable "hosted_zone_name" {
  description = "The name of the hosted zone to create"
  type = string
  validation {
    condition     = var.hosted_zone_name != ""
    error_message = "The hosted_zone_name cannot be empty."
  }
}

variable "environment" {
  description = "The environment to deploy to, used for tagging"
  type = string
  validation {
    condition     = var.environment != ""
    error_message = "The environment cannot be empty."
  }
}