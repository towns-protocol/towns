variable "backend_bucket_name" {
  description = "The name of the S3 bucket to store the Terraform state"
  type        = string
}

variable "backend_state_lock_table_name" {
  description = "The name of the DynamoDB table to store the Terraform state lock"
  type        = string
}

variable "environment" {
  description = "The environment to deploy to, used for tagging"
  type        = string
  validation {
    condition     = var.environment != ""
    error_message = "The environment cannot be empty."
  }
}