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

module "ecs_iam" {
  source      = "../../../modules/ecs-iam"
  environment = terraform.workspace == "global" ? "global" : ""
}

