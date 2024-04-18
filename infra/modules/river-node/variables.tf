variable "vpc_id" {
  description = "The vpc id"
  type        = string
}

variable "git_pr_number" {
  description = "The GitHub Pull Request number"
  type        = number
  default     = null
}

variable "dns_name" {
  description = "dns record name for the river node"
  type        = string
}

variable "node_number" {
  description = "The number assigned to the node. i.e 1 for river1.nodes.gamma.towns.com"
  type        = number
}

variable "ecs_cluster" {
  description = "Name and id of the ecs cluster"
  type = object({
    name = string
    id   = string
  })
}

variable "public_subnets" {
  type = list(string)
}

variable "private_subnets" {
  type = list(string)
}

variable "is_transient" {
  description = "Whether or not this db is transient"
  type        = bool
  default     = false
}

variable "river_node_db" {
  description = "The river node db module"
  type        = any
}

variable "log_level" {
  description = "The log level for the river node (e.g debug, info, warn, error)"
  type        = string
  default     = "info"
}

variable "base_chain_id" {
  description = "The base chain id"
  type        = string
}

variable "river_chain_id" {
  description = "The river chain id"
  type        = string
}

variable "base_chain_network_url_override" {
  description = "(optional) The base chain network url override"
  type        = any
  default     = null
}

variable "river_chain_network_url_override" {
  description = "(optional) The river chain network url override"
  type        = any
  default     = null
}

variable "river_node_ssl_cert_secret_arn" {
  description = "The secret ARN for the SSL cert and key for the river node"
  type        = string
}

variable "system_parameters" {
  type = any
}

variable "lb" {
  type = object({
    lb_arn               = string
    lb_security_group_id = string
    lb_dns_name          = string
  })
}
