module "global_constants" {
  source = "../global-constants"
}

resource "aws_ssm_parameter" "space_factory_contract_address" {
  name  = "space-factory-contract-address-${terraform.workspace}"
  type  = "String"
  value = "NULL"

  lifecycle {
    ignore_changes = [value]
  }

  tags = module.global_constants.tags
}

resource "aws_ssm_parameter" "wallet_link_contract_address" {
  name  = "wallet-link-contract-address-${terraform.workspace}"
  type  = "String"
  value = "NULL"

  lifecycle {
    ignore_changes = [value]
  }

  tags = module.global_constants.tags
}

resource "aws_ssm_parameter" "river_registry_contract_address" {
  name  = "river-registry-contract-address-${terraform.workspace}"
  type  = "String"
  value = "NULL"

  lifecycle {
    ignore_changes = [value]
  }

  tags = module.global_constants.tags
}

resource "aws_ssm_parameter" "entitlement_checker_contract_address" {
  name  = "entitlement-checker-contract-address-${terraform.workspace}"
  type  = "String"
  value = "NULL"

  lifecycle {
    ignore_changes = [value]
  }

  tags = module.global_constants.tags
}
