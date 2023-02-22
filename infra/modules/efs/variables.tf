variable "subnet_id" {
  description = "The subnet id for the efs mount target"
  type = string
}

variable "inbound_security_groups" {
  description = "The security group ids that can access the efs mount target"
  type = list(string)
}

variable "vpc_id" {
  description = "The vpc id"
  type = string
}