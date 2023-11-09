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