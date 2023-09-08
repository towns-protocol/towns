output "rds_river_node_credentials_arn" {
  value     = aws_secretsmanager_secret.rds_river_node_credentials.arn
  sensitive = false
}

output "river_node_wallet_credentials_arn" {
  value     = aws_secretsmanager_secret.river_node_wallet_credentials.arn
  sensitive = false
}
