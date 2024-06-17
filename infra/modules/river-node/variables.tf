variable "vpc_id" {
  description = "The vpc id"
  type        = string
}

variable "git_pr_number" {
  description = "The GitHub Pull Request number"
  type        = number
  default     = null
}

variable "enable_debug_endpoints" {
  description = "Whether or not to enable debug endpoints"
  type        = bool
  default     = false
}

variable "node_metadata" {
  description = "Object containing details such as node_name, node_number, node_address, etc."
  type        = any
}

variable "docker_image_tag" {
  description = "The docker image tag for the river node"
  type        = string
  default     = "dev"
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

variable "base_chain_rpc_url_secret_arn" {
  description = "The secret ARN for the base chain rpc url"
  type        = any
  default     = null
}

variable "river_chain_rpc_url_secret_arn" {
  description = "The secret ARN for the river chain rpc url"
  type        = any
  default     = null
}

variable "base_chain_rpc_url_plaintext_override" {
  description = "(optional) The base chain rpc url override"
  type        = any
  default     = null
}

variable "river_chain_rpc_url_plaintext_override" {
  description = "(optional) The river chain rpc url override"
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
