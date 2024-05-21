variable "vpc_id" {
  description = "The vpc id"
  type        = string
}

variable "public_subnets" {
  description = "A list of subnets for the redis cluster"
  type        = list(string)
}

variable "private_subnets" {
  description = "A list of subnets for the stress test nodes"
  type        = list(string)
}

variable "base_chain_rpc_url_secret_arn" {
  description = "base chain rpc url secret arn"
  type        = string
}

variable "river_chain_rpc_url_secret_arn" {
  description = "river chain rpc url secret arn"
  type        = string
}
