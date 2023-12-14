output "db_password" {
  value = aws_secretsmanager_secret.river_node_db_password
}

output "wallet_private_key" {
  value = aws_secretsmanager_secret.river_node_wallet_private_key
}
