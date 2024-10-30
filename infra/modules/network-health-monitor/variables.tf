variable "subnet_ids" {
  description = "The subnet ids for the lambda"
  type        = list(string)
}

variable "river_registry_contract_address" {
  description = "The address of the river registry contract"
  type        = string
}

variable "base_registry_contract_address" {
  description = "The address of the base registry contract"
  type        = string

}

variable "space_owner_contract_address" {
  description = "The address of the space owner contract"
  type        = string
}

variable "river_chain_rpc_url_secret_arn" {
  description = "The secret ARN for the river chain rpc url"
  type        = string
}

variable "base_chain_rpc_url_secret_arn" {
  description = "The secret ARN for the base chain rpc url"
  type        = string
}
