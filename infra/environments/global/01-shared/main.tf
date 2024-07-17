terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.13.1"
    }
  }

  backend "s3" {}

  required_version = ">= 1.0.3"
}

provider "aws" {
  region  = "us-east-1"
  profile = "harmony-github-actions"
}

module "global_constants" {
  source = "../../../modules/global-constants"
}

resource "aws_acm_certificate" "primary_hosted_zone_cert" {
  domain_name       = module.global_constants.primary_hosted_zone_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  subject_alternative_names = [
    "*.${module.global_constants.primary_hosted_zone_name}",
    "api.rdr.${module.global_constants.primary_hosted_zone_name}",
    "data.rdr.${module.global_constants.primary_hosted_zone_name}",
    "sdk.rdr.${module.global_constants.primary_hosted_zone_name}",
  ]

  tags = merge(module.global_constants.tags, { Name = module.global_constants.primary_hosted_zone_name })
}

resource "aws_iam_role" "ecs_task_execution_role" {
  name                = "ecsTaskExecutionRole"
  managed_policy_arns = ["arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"]
  assume_role_policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Sid" : "",
        "Effect" : "Allow",
        "Principal" : {
          "Service" : "ecs-tasks.amazonaws.com"
        },
        "Action" : "sts:AssumeRole"
      }
    ]
  })

  tags = module.global_constants.tags
}

resource "aws_secretsmanager_secret" "hnt_dockerhub_access_key" {
  name = "hnt_dockerhub_access_key"
  tags = module.global_constants.tags
}

resource "aws_secretsmanager_secret_version" "hnt_dockerhub_access_key" {
  secret_id     = aws_secretsmanager_secret.hnt_dockerhub_access_key.id
  secret_string = <<EOF
{
  "username": "DUMMY",
  "password": "DUMMY"
}
EOF
}

resource "aws_secretsmanager_secret" "river_global_dd_agent_api_key" {
  name = "river-global-datadog-agent-api-key"
  tags = module.global_constants.tags
}

resource "aws_secretsmanager_secret_version" "river_global_dd_agent_api_key" {
  secret_id     = aws_secretsmanager_secret.river_global_dd_agent_api_key.id
  secret_string = "DUMMY"
}

resource "aws_secretsmanager_secret" "river_global_read_db_password" {
  name        = "river-global-readonly-db-password"
  description = "Shared read only db credentials for river node"
}

resource "aws_secretsmanager_secret_version" "river_global_read_db_password" {
  secret_id     = aws_secretsmanager_secret.river_global_read_db_password.id
  secret_string = "DUMMY"
}

resource "aws_secretsmanager_secret" "pgadmin_google_oauth2_config" {
  name        = "pgadmin-google-oauth2-config"
  description = "Google Auth Client ID"
}

resource "aws_secretsmanager_secret_version" "pgadmin_google_oauth2_config" {
  secret_id     = aws_secretsmanager_secret.pgadmin_google_oauth2_config.id
  secret_string = "DUMMY"
}

resource "aws_secretsmanager_secret" "notification_service_db_password_secret" {
  name        = "notification-service-db-password"
  description = "Notification service db password"
}

resource "aws_secretsmanager_secret_version" "notification_service_db_password_secret" {
  secret_id     = aws_secretsmanager_secret.notification_service_db_password_secret.id
  secret_string = "DUMMY"
}

resource "aws_secretsmanager_secret" "river_sepolia_rpc_url_secret" {
  name        = "river-sepolia-rpc-url"
  description = "River Sepolia RPC URL"
}

resource "aws_secretsmanager_secret" "river_mainnet_rpc_url_secret" {
  name        = "river-mainnet-rpc-url"
  description = "River Mainnet RPC URL"
}

resource "aws_secretsmanager_secret" "base_sepolia_rpc_url_secret" {
  name        = "base-sepolia-rpc-url"
  description = "Base Sepolia RPC URL"
}

resource "aws_secretsmanager_secret" "base_mainnet_metics_rpc_url_secret" {
  name        = "base-mainnet-metrics-rpc-url"
  description = "Base Mainnet Metrics RPC URL"
}

resource "aws_secretsmanager_secret" "base_sepolia_metrics_rpc_url_secret" {
  name        = "base-sepolia-metrics-rpc-url"
  description = "Base Sepolia Metrics RPC URL"
}

resource "aws_secretsmanager_secret" "base_mainnet_rpc_url_secret" {
  name        = "base-mainnet-rpc-url"
  description = "Base Mainnet RPC URL"
}

resource "aws_secretsmanager_secret" "gamma_chainsstring_secret" {
  name        = "gamma-chainsstring"
  description = "csv pairs of chain ids and rpc urls for gamma"
}

resource "aws_secretsmanager_secret" "omega_chainsstring_secret" {
  name        = "omega-chainsstring"
  description = "csv pairs of chain ids and rpc urls for omega"
}

module "river_node_credentials" {
  source = "../../../modules/river-node-credentials"

  count = 11

  node_number = count.index + 1
}


resource "null_resource" "lambda_npm_dependencies" {
  provisioner "local-exec" {
    command = "cd ${path.root}/lambda-function && npm install"
  }

  triggers = {
    index   = sha256(file("${path.root}/lambda-function/index.js"))
    package = sha256(file("${path.root}/lambda-function/package.json"))
    lock    = sha256(file("${path.root}/lambda-function/package-lock.json"))
  }
}

locals {
  lambda_zip_file_name = "post_provision_config_lambda_code.zip"
  source_dir           = "${path.root}/lambda-function/"
}

data "null_data_source" "wait_for_npm_dependecies_exporter" {
  depends_on = [null_resource.lambda_npm_dependencies]
  inputs = {
    lambda_dependency_id = null_resource.lambda_npm_dependencies.id
    source_dir           = local.source_dir
  }
}

data "archive_file" "build_zip_lambda" {
  depends_on  = [null_resource.lambda_npm_dependencies]
  output_path = "${path.root}/${local.lambda_zip_file_name}"
  source_dir  = local.source_dir
  type        = "zip"
}

resource "aws_s3_bucket" "hnt_lambdas" {
  bucket = "here-not-there-lambdas"
  tags   = module.global_constants.tags
}

resource "aws_s3_object" "post_provision_config_lambda_code" {
  bucket = aws_s3_bucket.hnt_lambdas.bucket
  key    = local.lambda_zip_file_name
  source = data.archive_file.build_zip_lambda.output_path
  etag   = data.archive_file.build_zip_lambda.output_md5
}

resource "aws_s3_bucket_versioning" "post_provision_config_lambda_code_versioning" {
  bucket = aws_s3_bucket.hnt_lambdas.bucket
  versioning_configuration {
    status = "Enabled"
  }
}

module "public_ecr" {
  source  = "mattyait/ecr/aws"
  version = "1.2.0"

  image_names = [
    "river-node",
    "forked-chain-service",
    "notification-service",
    "hnt-infra",
    "hnt-load-test-node",
    "hnt-ecs-service-discovery"
  ]
  repository_type = "public"
  tags            = module.global_constants.tags
}

# a secret that contains account used to register with the ACME server
resource "aws_secretsmanager_secret" "river_node_acme_account" {
  name        = "river-node-ssl-acme-account-secret-${terraform.workspace}"
  tags        = module.global_constants.tags
  description = "ACME account for the river node"
}

resource "aws_secretsmanager_secret" "cloudflare_api_token" {
  name        = "cloudflare-api-token-${terraform.workspace}"
  description = "cloudflare api token"
}

resource "aws_secretsmanager_secret" "datadog_application_key" {
  name = "datadog-application-key-${terraform.workspace}"
}

resource "aws_secretsmanager_secret" "stress_test_wallet_seed_phrase" {
  name = "stress-test-wallet-seed-phrase-${terraform.workspace}"
}

resource "aws_secretsmanager_secret" "stress_test_wallet_private_key" {
  name = "stress-test-wallet-private-key-${terraform.workspace}"
}

resource "aws_secretsmanager_secret" "node_operator_wallet_private_key" {
  name = "node-operator-wallet-private-key-${terraform.workspace}"
}

resource "aws_secretsmanager_secret" "notification_apns_auth_key" {
  name        = "notifications-apns-auth-key-${terraform.workspace}"
  description = "APNS auth key for notification service"
}
