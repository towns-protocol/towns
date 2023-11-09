variable "river_node_name" {
  description = "The name of the river node"
  type        = string
  validation {
    condition     = var.river_node_name != ""
    error_message = "The node name cannot be empty."
  }
}

variable "vpc_id" {
  description = "The vpc id"
  type        = string
  validation {
    condition     = var.vpc_id != ""
    error_message = "The vpc id cannot be empty."
  }
}

variable "ecs_task_execution_role_id" {
  description = "The ecs task execution role id"
  type        = string
  validation {
    condition     = var.ecs_task_execution_role_id != ""
    error_message = "The ecs task execution role id cannot be empty."
  }
}

variable "database_subnets" {
  description = "List of subnet IDs used by database subnet group created"
  type        = list(string)
  default     = []
}

variable "allowed_cidr_blocks" {
  description = "A list of CIDR blocks which are allowed to access the database"
  type        = list(string)
  default     = []
}