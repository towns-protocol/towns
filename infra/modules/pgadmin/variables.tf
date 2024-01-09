variable "vpc_id" {
  description = "The vpc id"
  type        = string
}

variable "public_subnets" {
  description = "A list of subnets to associate with the application load balancer"
  type        = list(string)
}

variable "private_subnets" {
  description = "A list of subnets to associate with the pgadmin ECS Task"
  type        = list(string)
}

variable "ecs_cluster" {
  description = "Name and id of the ecs cluster"
  type = object({
    name = string
    id   = string
  })
}

variable "river_node_db" {
  description = "The river node db module"
  type        = any
  default     = ""
}

variable "alb_https_listener_arn" {
  description = "The arn of the alb https listener"
  type        = string
  default     = ""
}

variable "alb_dns_name" {
  description = "Loadbalancer DNS name for river node"
  type        = string
  default     = ""
}

variable "alb_security_group_id" {
  description = "The security group id of the alb"
  type        = string
  default     = ""
}

variable "create_loadbalancer" {
  description = "Flag to decide creation of separate ALB and related resources (true/false)"
  type        = string
  default     = false
}
