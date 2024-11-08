variable "vpc_id" {
  description = "The vpc id"
  type        = string
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
  description = "Loadbalancer DNS name for the service"
  type        = string
}

variable "ecs_cluster" {
  description = "Name and id of the ecs cluster"
  type = object({
    name = string
    id   = string
  })
}

variable "private_subnets" {
  type = list(string)
}

variable "db_subnets" {
  type = list(string)
}

variable "river_chain_id" {
  description = "The river chain id"
  type        = string
}

variable "river_chain_rpc_url_secret_arn" {
  description = "The secret ARN for the river chain rpc url"
  type        = any
  default     = null
}

variable "system_parameters" {
  type = any
}

variable "docker_image_tag" {
  description = "The docker image tag for the river node"
  type        = string
  default     = "dev"
}

variable "log_level" {
  description = "The log level for the river node (e.g debug, info, warn, error)"
  type        = string
  default     = "info"
}

variable "max_db_connections" {
  description = "The maximum number of database connections on the client side"
  type        = number
  default     = 1000
}

variable "pgadmin_security_group_id" {
  description = "The security group id of the pgadmin service"
  type        = string
}
