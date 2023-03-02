variable "dendrite_node_name" {
  description = "The name of the dendrite node"
  type = string
}

variable "ecs_cluster_id" {
  description = "The id of the ecs cluster"
  type = string
}

variable "subnets" {
  description = "A list of subnets to associate with the dendrite nodes"
  type        = list(string)
}

variable "vpc_id" {
  description = "The vpc id"
  type = string
}

variable "dendrite_alb_security_group_id" {
  description = "The security group id of the dendrite alb"
  type = string
}

variable "bastion_host_security_group_id" {
  description = "The security group id of the bastion host"
  type = string
}

variable "dendrite_log_group_name" {
  description = "The name of the dendrite log group"
  type = string
}

variable "dendrite_server_target_group_arn" {
  description = "The arn of the dendrite server target group"
  type = string
}

variable "dendrite_profiler_target_group_arn" {
  description = "The arn of the dendrite profiler target group"
  type = string
}
