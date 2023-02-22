variable "zion_node_name" {
  description = "The name of the zion node"
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

variable "subnets" {
  description = "A list of subnets to associate with the load balancer. e.g. ['subnet-1a2b3c4d','subnet-1a2b3c4e','subnet-1a2b3c4f']"
  type        = list(string)
}

variable "bastion_host_security_group_id" {
  description = "The security group id of the bastion host"
  type = string
}