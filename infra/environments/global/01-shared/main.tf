terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.16"
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
    "*.${module.global_constants.primary_hosted_zone_name}"
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

resource "aws_secretsmanager_secret" "river_global_push_notification_auth_token" {
  name = "river-global-push-notification-auth-token"
  tags = module.global_constants.tags
}

resource "aws_secretsmanager_secret_version" "river_global_push_notification_auth_token" {
  secret_id     = aws_secretsmanager_secret.river_global_push_notification_auth_token.id
  secret_string = "DUMMY"
}

resource "aws_secretsmanager_secret" "river_global_dd_agent_api_key" {
  name = "river-global-datadog-agent-api-key"
  tags = module.global_constants.tags
}

resource "aws_secretsmanager_secret_version" "river_global_dd_agent_api_key" {
  secret_id     = aws_secretsmanager_secret.river_global_dd_agent_api_key.id
  secret_string = "DUMMY"
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
  inputs = {
    lambda_dependency_id = null_resource.lambda_npm_dependencies.id
    source_dir           = local.source_dir
  }
}

data "archive_file" "build_zip_lambda" {
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
