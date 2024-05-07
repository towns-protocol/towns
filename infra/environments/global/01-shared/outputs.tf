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

output "post_provision_config_lambda_s3_object" {
  description = "S3 Object for lambda zip packaged file"
  value       = aws_s3_object.post_provision_config_lambda_code
}

output "lambdas_s3_bucket" {
  description = "S3 Bucket for lambda zip packaged files"
  value       = aws_s3_bucket.hnt_lambdas
}

output "river_node_credentials_secret" {
  description = "Secrets for river node credentials"
  value       = module.river_node_credentials
}

output "public_ecr" {
  description = "Public ECR repository"
  value       = module.public_ecr
}

output "readonlyuser_db_password_secret" {
  value = aws_secretsmanager_secret.river_global_read_db_password
}

output "pgadmin_google_oauth2_config_secret" {
  value = aws_secretsmanager_secret.pgadmin_google_oauth2_config
}

output "base_chain_network_url_secret" {
  value = aws_secretsmanager_secret.base_chain_network_url_secret
}

output "river_chain_network_url_secret" {
  value = aws_secretsmanager_secret.river_chain_network_url_secret
}

output "river_node_acme_account_secret" {
  value = aws_secretsmanager_secret.river_node_acme_account
}

output "cloudflare_api_token_secret" {
  value = aws_secretsmanager_secret.cloudflare_api_token
}

output "notification_service_db_password_secret" {
  value = aws_secretsmanager_secret.notification_service_db_password_secret
}

output "datadog_application_key_secret" {
  value = aws_secretsmanager_secret.datadog_application_key
}

output "stress_test_wallet_seed_phrase_secret" {
  value = aws_secretsmanager_secret.stress_test_wallet_seed_phrase
}

output "stress_test_wallet_private_key_secret" {
  value = aws_secretsmanager_secret.stress_test_wallet_private_key
}

output "node_operator_wallet_private_key" {
  value = aws_secretsmanager_secret.node_operator_wallet_private_key
}

output "notification_vapid_key_secret" {
  value = aws_secretsmanager_secret.notification_vapid_key
}

output "notification_apns_auth_key_secret" {
  value = aws_secretsmanager_secret.notification_apns_auth_key
}
