module "global_constants" {
  source = "../global-constants"
}

locals {
  node_name = "river${var.node_number}"
}

resource "aws_secretsmanager_secret" "river_node_db_password" {
  name        = "shared-${local.node_name}-db-password"
  description = "Shared db credentials for river node: ${local.node_name}. These credentials are shared accross multiple environments and should be used for testing purposes only. DO NOT USE IN PRODUCTION."
  tags = merge(
    module.global_constants.tags,
    {
      Node_Number = var.node_number
      Node_Name   = local.node_name
    }
  )
}
resource "aws_secretsmanager_secret_version" "river_node_db_password" {
  secret_id     = aws_secretsmanager_secret.river_node_db_password.id
  secret_string = "DUMMY"
}



resource "aws_secretsmanager_secret" "river_node_wallet_private_key" {
  name        = "shared-${local.node_name}-wallet-private-key"
  description = "Shared wallet private key for river node: ${local.node_name}. These credentials are shared accross multiple environments and should be used for testing purposes only. DO NOT USE IN PRODUCTION."
  tags = merge(
    module.global_constants.tags,
    {
      Node_Number = var.node_number
      Node_Name   = local.node_name
    }
  )
}
resource "aws_secretsmanager_secret_version" "river_node_wallet_private_key" {
  secret_id     = aws_secretsmanager_secret.river_node_wallet_private_key.id
  secret_string = "DUMMY"
}

