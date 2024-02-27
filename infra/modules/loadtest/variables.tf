variable "vpc_id" {
  description = "The vpc id"
  type        = string
}

variable "public_subnets" {
  description = "A list of subnets to associate with the application load balancer"
  type        = list(string)
}

variable "private_subnets" {
  description = "A list of subnets to associate with the pgadmin ECS Task"
  type        = list(string)
}

variable "river_node_url" {
  description = "river node url to pass as environment details"
  type        = string
}

variable "base_chain_rpc_url_override" {
  description = "base chain rpc url"
  type        = string
  default     = null
}
