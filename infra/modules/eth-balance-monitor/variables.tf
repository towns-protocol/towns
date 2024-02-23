variable "subnet_ids" {
  description = "The subnet ids for the lambda"
  type        = list(string)
}

variable "river_registry_contract_address" {
  description = "The address of the river registry contract"
  type        = string
}
