variable "subnet_id" {
  description = "The subnet id for the ec2 instance"
  type = string
}

variable "vpc_id" {
  description = "The vpc id"
  type        = string
  validation {
    condition     = var.vpc_id != ""
    error_message = "The vpc id cannot be empty."
  }
}