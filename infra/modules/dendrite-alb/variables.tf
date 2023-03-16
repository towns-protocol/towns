variable "vpc_id" {
  description = "The vpc id"
  type = string
}

variable "subnets" {
  description = "A list of subnets to associate with the application load balancer"
  type        = list(string)
}

variable "pgadmin_subdomain" {
  description = "The subdomain for pgadmin"
  type        = string
}

