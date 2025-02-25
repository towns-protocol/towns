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

variable "migration_config" {
  description = "The migration configuration for the river node database"
  type = object({
    rds_public_access : bool
    delete_rds_instance : bool
  })
}
