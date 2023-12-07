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

variable "database_subnets" {
  description = "List of subnet IDs used by database subnet group created"
  type        = list(string)
}

variable "cluster_source_identifier" {
  description = "The cluster identifier of the source cluster when restoring from a snapshot or backup"
  type        = string
  default     = null
}

variable "is_transient" {
  description = "Whether or not this db is transient"
  type        = bool
  default     = false
}
