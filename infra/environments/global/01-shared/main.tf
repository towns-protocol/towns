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

module "route_53_hosted_zone" {
  source           = "../../../modules/route-53-hosted-zone"
  hosted_zone_name = module.global_constants.hosted_zone_name
  environment      = terraform.workspace == "global" ? "global" : ""
}

module "ecs_iam" {
  source      = "../../../modules/ecs-iam"
  environment = terraform.workspace == "global" ? "global" : ""
}

