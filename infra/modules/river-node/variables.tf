variable "vpc_id" {
  description = "The vpc id"
  type        = string
}

variable "node_name" {
  description = "The name of the river node"
  type        = string
}

variable "ecs_cluster" {
  description = "Name and id of the ecs cluster"
  type = object({
    name = string
    id   = string
  })
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

variable "alb_security_group_id" {
  description = "The security group id of the alb"
  type        = string
}

variable "alb_https_listener_arn" {
  description = "The arn of the alb https listener"
  type        = string
}

variable "alb_dns_name" {
  description = "Loadbalancer DNS name for river node"
  type        = string
}

variable "home_chain_id" {
  description = "The chain id of the home chain"
  type        = string
}

variable "push_notification_worker_url" {
  description = "The url of the push notification worker"
  type        = string
}

variable "database_cow_cluster_source_identifier" {
  description = "The cluster identifier of the source cluster when restoring from a snapshot or backup"
  type        = string
  default     = null
}
