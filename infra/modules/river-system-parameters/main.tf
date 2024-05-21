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

resource "aws_ssm_parameter" "space_owner_contract_address" {
  name  = "space-owner-contract-address-${terraform.workspace}"
  type  = "String"
  value = "NULL"

  lifecycle {
    ignore_changes = [value]
  }

  tags = module.global_constants.tags
}

# Creat an IAM policy that allows the attached entity to read the SSM parameters

resource "aws_iam_policy" "river_system_parameters_policy" {
  name        = "river-system-parameters-policy-${terraform.workspace}"
  description = "Policy for reading River system parameters"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath",
        ]
        Resource = [
          aws_ssm_parameter.space_factory_contract_address.arn,
          aws_ssm_parameter.river_registry_contract_address.arn,
          aws_ssm_parameter.entitlement_checker_contract_address.arn,
          aws_ssm_parameter.space_owner_contract_address.arn
        ]
      },
    ]
  })

  tags = module.global_constants.tags
}
