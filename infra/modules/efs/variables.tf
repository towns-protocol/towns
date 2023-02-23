variable "subnets" {
  description = "The subnet ids for the efs mount targets"
  type = list(string)
}

variable "inbound_security_groups" {
  description = "The security group ids that can access the efs mount target"
  type = list(string)
}

variable "vpc_id" {
  description = "The vpc id"
  type = string
}