variable "dendrite_node_name" {
  description = "The name of the dendrite node"
  type        = string
  validation {
    condition     = var.dendrite_node_name != ""
    error_message = "The dendrite node name cannot be empty."
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