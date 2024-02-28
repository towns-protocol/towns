variable "chain_name" {
  description = "A descriptor for the chain (i.e river-chain or base-chain)"
  type        = string
}

variable "chain_id" {
  description = "The chain id"
  type        = string
}

variable "vpc_id" {
  description = "The vpc id"
  type        = string
}

variable "ecs_cluster" {
  description = "Name and id of the ecs cluster"
  type = object({
    name = string
    id   = string
  })
}

variable "service_subnets" {
  description = "A list of subnets to run the service in"
  type        = list(string)
}

variable "alb_security_group_id" {
  description = "The security group id of the alb"
  type        = string
}

variable "alb_https_listener_arn" {
  description = "The arn of the alb https listener"
  type        = string
}

variable "alb_dns_name" {
  description = "Loadbalancer DNS name for river node"
  type        = string
}

variable "fork_block_number" {
  description = "value of the fork block number. integer or `latest`"
  type        = any
}

variable "block_time" {
  description = "value of the block time in seconds"
  type        = number
}

variable "fork_url_secret_arn" {
  description = "The secret arn for the fork url"
  type        = string
}

variable "river_registry_contract_address" {
  type    = string
  default = ""
}

variable "nodes_csv" {
  type    = string
  default = ""
}
