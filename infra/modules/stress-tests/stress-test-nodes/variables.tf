variable "vpc_id" {
  description = "The vpc id"
  type        = string
}

variable "subnets" {
  description = "A list of subnets to associate with the leader task"
  type        = list(string)
}

variable "ecs_cluster" {
  description = "Name and id of the ecs cluster"
  type = object({
    name = string
    id   = string
  })
}

variable "tags" {
  description = "Tags to be added on leader resources"
  type        = map(any)
  default     = {}
}

variable "base_chain_rpc_url_secret_arn" {
  description = "base chain rpc url secret arn"
  type        = string
}

variable "river_chain_rpc_url_secret_arn" {
  description = "river chain rpc url secret arn"
  type        = string
}

variable "container_index" {
  description = "Index of the stress test container"
  type        = number
}

variable "stress_test_wallet_mnemonic_secret_arn" {
  description = "ARN of the secret containing the stress test wallet mnemonic"
  type        = string
}

variable "system_parameters" {
  type = any
}

variable "security_group_id" {
  description = "The security group id for ECS tasks"
  type        = string
}
