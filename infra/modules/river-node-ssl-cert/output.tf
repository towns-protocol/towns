output "river_node_ssl_cert_secret_arn" {
  value = aws_secretsmanager_secret.river_node_ssl_cert.arn
}
