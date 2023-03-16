variable "vpc_id" {
  description = "The vpc id"
  type = string
}

variable "dendrite_alb_security_group_id" {
  description = "The security group id of the dendrite alb"
  type = string
}

variable "ecs_cluster_id" {
  description = "The id of the ecs cluster"
  type = string
}

variable "target_group_arn" {
  description = "The pgadmin target group arn"
  type = string
}

variable "subnets" {
  description = "A list of subnets to associate with pgmadmin"
  type        = list(string)
}