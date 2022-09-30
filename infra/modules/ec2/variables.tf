variable "ecs_cluster_name" {
  description = "The cluster name to register the instance to"
  type        = string
  validation {
    condition     = var.ecs_cluster_name != ""
    error_message = "The ecs cluster name cannot be empty."
  }
}

variable "security_group_id" {
  description = "The security group id for the ec2 instance"
  type = string
}

variable "subnet_id" {
  description = "The subnet id for the ec2 instance"
  type = string
}