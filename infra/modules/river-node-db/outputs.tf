output "rds_river_node_credentials_arn" {
  value     = aws_secretsmanager_secret.rds_river_node_credentials.arn
  sensitive = false
}