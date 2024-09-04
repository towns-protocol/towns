variable "vpc_id" {
  description = "The vpc id"
  type        = string
}

variable "subnets" {
  description = "A list of public subnets to associate with the load balancer"
  type        = list(string)
}

variable "default_target_group_arn" {
  type = string
}
