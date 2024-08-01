module "global_constants" {
  source = "../global-constants"
}
locals {
  # TODO: remove this empty prefix check after the migration
  prefix = var.node_prefix == "" ? "" : "${var.node_prefix}-"
  # TODO: remove this var.environment reference, and replace it with terraform.workspace
  node_name = "${var.environment}-${local.prefix}river${var.node_number}"
}

resource "aws_secretsmanager_secret" "river_node_db_password" {
  name        = "${local.node_name}-db-password"
  description = "DB credentials for river node: ${local.node_name}"
  tags        = module.global_constants.tags
}

resource "aws_secretsmanager_secret_version" "river_node_db_password" {
  secret_id     = aws_secretsmanager_secret.river_node_db_password.id
  secret_string = "DUMMY"
}

resource "aws_secretsmanager_secret" "river_node_wallet_private_key" {
  name        = "${local.node_name}-wallet-private-key"
  description = "Wallet private key for river node: ${local.node_name}"
  tags        = module.global_constants.tags
}

resource "aws_secretsmanager_secret_version" "river_node_wallet_private_key" {
  secret_id     = aws_secretsmanager_secret.river_node_wallet_private_key.id
  secret_string = "DUMMY"
}
