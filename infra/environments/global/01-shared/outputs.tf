output "river_global_dd_agent_api_key" {
  value     = aws_secretsmanager_secret.river_global_dd_agent_api_key
  sensitive = true
}

output "river_global_push_notification_auth_token" {
  value     = aws_secretsmanager_secret.river_global_push_notification_auth_token
  sensitive = true
}

output "hnt_dockerhub_access_key" {
  value     = aws_secretsmanager_secret.hnt_dockerhub_access_key
  sensitive = true
}

output "primary_hosted_zone_cert" {
  value     = aws_acm_certificate.primary_hosted_zone_cert
  sensitive = true
}
