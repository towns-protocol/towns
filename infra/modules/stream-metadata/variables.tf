variable "vpc_id" {
  description = "The vpc id"
  type        = string
}

variable "river_chain_rpc_url_secret_arn" {
  description = "The secret ARN for the river chain rpc url"
  type        = string
}

variable "subnets" {
  description = "A list of subnets to associate with the service"
  type        = list(string)
}

variable "ecs_cluster" {
  description = "Name and id of the ecs cluster"
  type = object({
    name = string
    id   = string
  })
}

variable "alb_security_group_id" {
  description = "The security group id for the alb"
  type        = string
}

variable "alb_https_listener_arn" {
  description = "The arn of the alb https listener"
  type        = string
}

variable "alb_dns_name" {
  description = "The dns name of the alb"
  type        = string
}
