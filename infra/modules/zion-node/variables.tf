variable "dendrite_node_name" {
  description = "The name of the dendrite node"
  type = string
}

variable "vpc_id" {
  description = "The vpc id"
  type = string
}

variable "vpc_cidr_block" {
  description = "The vpc cidr block"
  type = string
}

variable "dendrite_node_subnets" {
  description = "A list of subnets to associate with the dendrite nodes"
  type        = list(string)
}

variable "alb_subnets" {
  description = "A list of subnets to associate with the application load balancer"
  type        = list(string)
}

variable "bastion_host_security_group_id" {
  description = "The security group id of the bastion host"
  type = string
}

variable "dendrite_log_group_name" {
  description = "The name of the dendrite log group"
  type = string
}


