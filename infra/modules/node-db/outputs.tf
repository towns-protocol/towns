output "rds_dendrite_node_credentials_arn" {
  value = aws_secretsmanager_secret.rds_dendrite_node_credentials.arn
  sensitive = false
}