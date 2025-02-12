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
  description = "The security group id of the pgadmin service"
  type        = string
}

variable "cluster_name_suffix" {
  default = "-postgresql-cluster"
}

variable "min_capacity" {
  type    = number
  default = 0.5
}

variable "max_capacity" {
  type    = number
  default = 20
}

variable "publicly_accessible" {
  type    = bool
  default = false
}
