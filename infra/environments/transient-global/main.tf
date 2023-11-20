provider "aws" {
  region = "us-east-1"
}

# provider "datadog" {
#   api_key = var.datadog_api_key
#   app_key = var.datadog_app_key
# }

# provider "cloudflare" {
#   api_token = var.cloudflare_terraform_api_token
# }


terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.13.1"
    }
    # datadog = {
    #   source = "DataDog/datadog"
    #   version = "3.32.0"
    # }
    # cloudflare = {
    #   source  = "cloudflare/cloudflare"
    #   version = "~> 4.0"
    # }
  }

  backend "s3" {}

  required_version = ">= 1.0.3"
}

module "global_constants" {
  source = "../../modules/global-constants"
}

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "river-vpc-${module.global_constants.environment}"
  cidr = "10.3.0.0/16"

  azs = ["us-east-1a", "us-east-1b"]

  public_subnets   = ["10.3.101.0/24", "10.3.102.0/24"]
  database_subnets = ["10.3.201.0/24", "10.3.202.0/24"]
  private_subnets  = ["10.3.1.0/24", "10.3.2.0/24"]

  enable_vpn_gateway     = false
  enable_nat_gateway     = true
  single_nat_gateway     = true
  one_nat_gateway_per_az = false

  tags = module.global_constants.tags

  enable_dns_hostnames = true
}

module "river_alb" {
  source = "../../modules/river-alb"

  subnets = module.vpc.public_subnets
  vpc_id  = module.vpc.vpc_id
}
