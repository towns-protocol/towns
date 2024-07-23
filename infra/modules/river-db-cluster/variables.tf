variable "vpc_id" {
  description = "The vpc id"
  type        = string
  validation {
    condition     = var.vpc_id != ""
    error_message = "The vpc id cannot be empty."
  }
}

variable "database_subnets" {
  description = "List of subnet IDs used by database subnet group created"
  type        = list(string)
}

variable "pgadmin_security_group_id" {
  description = "(optional) The security group id of the pgadmin service"
  type        = any
  default     = null
}
