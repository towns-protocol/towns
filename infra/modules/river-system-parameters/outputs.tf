output "space_factory_contract_address_parameter" {
  value = aws_ssm_parameter.space_factory_contract_address
}

output "wallet_link_contract_address_parameter" {
  value = aws_ssm_parameter.wallet_link_contract_address
}

output "river_registry_contract_address_parameter" {
  value = aws_ssm_parameter.river_registry_contract_address
}

output "entitlement_checker_contract_address_parameter" {
  value = aws_ssm_parameter.entitlement_checker_contract_address
}

output "space_owner_contract_address_parameter" {
  value = aws_ssm_parameter.space_owner_contract_address
}

output "river_system_parameters_policy" {
  value = aws_iam_policy.river_system_parameters_policy
}
