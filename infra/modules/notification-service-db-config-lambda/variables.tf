variable "vpc_id" {
  description = "The vpc id"
  type        = string
  validation {
    condition     = var.vpc_id != ""
    error_message = "The vpc id cannot be empty."
  }
}

variable "subnet_ids" {
  description = "The subnet ids for the lambda"
  type        = list(string)
}

variable "db_cluster" {
  description = "The database cluster to connect to"
  type        = any
}
