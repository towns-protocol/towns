variable "vpc_id" {
  description = "The vpc id"
  type        = string
}

variable "ecs_cluster_id" {
  description = "The id of the ecs cluster"
  type        = string
}

variable "node_name" {
  description = "The name of the river node"
  type        = string
}

variable "ecs_cluster_name" {
  description = "The name of the ecs cluster"
  type        = string
}

variable "node_subnets" {
  description = "A list of subnets to associate with the river nodes"
  type        = list(string)
}

variable "database_subnets" {
  description = "List of subnet IDs used by database subnet group created"
  type        = list(string)
  default     = []
}

variable "database_allowed_cidr_blocks" {
  description = "List of CIDR blocks allowed to connect to the database"
  type        = list(string)
  default     = []
}

variable "nlb_security_group_id" {
  description = "The security group id of the nlb"
  type        = string
}

variable "river_node_blue_target_group_arn" {
  description = "The arn for the blue river node target group"
  type        = string
}

variable "river_node_green_target_group_arn" {
  description = "The arn for the green river node target group"
  type        = string
}

variable "river_tls_listener_arn" {
  description = "The arn for the tls listener"
  type        = string
}

