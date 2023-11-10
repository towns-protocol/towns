provider "aws" {
  region  = "us-east-1"
}

provider "datadog" {
  api_key = var.datadog_api_key
  app_key = var.datadog_app_key
}

provider "cloudflare" {
  api_token = var.cloudflare_terraform_api_token
}

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.13.1"
    }
    datadog = {
      source = "DataDog/datadog"
      version = "3.32.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }

  backend "s3" {}

  required_version = ">= 1.0.3"
}

module "global_constants" {
  source = "../../modules/global-constants"
}

locals {
  river_node_name = "river-1-${module.global_constants.environment}"
  river_node_subdomain_name = "river1-${module.global_constants.environment}"
}

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "river-vpc-${module.global_constants.environment}"
  cidr = "10.1.0.0/16"

  azs = ["us-east-1a", "us-east-1b"]

  public_subnets   = ["10.1.101.0/24", "10.1.102.0/24"]
  database_subnets = ["10.1.201.0/24", "10.1.202.0/24"]
  private_subnets  = ["10.1.1.0/24", "10.1.2.0/24"]

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
  river_node_name = local.river_node_name
}

module "river_node" {
  source = "../../modules/river-node"

  depends_on = [
    module.vpc,
    module.river_alb
  ]

  node_subnets                   = module.vpc.private_subnets
  vpc_id                         = module.vpc.vpc_id
  node_name                      = local.river_node_name

  alb_security_group_id             = module.river_alb.security_group_id
  river_https_listener_arn          = module.river_alb.river_https_listener_arn

  river_node_blue_target_group  = module.river_alb.river_node_blue_target_group
  river_node_green_target_group = module.river_alb.river_node_green_target_group

  database_allowed_cidr_blocks = module.vpc.private_subnets_cidr_blocks
  database_subnets             = module.vpc.database_subnets

  l1_chain_id = 84531
  push_notification_worker_url = "https://push-notification-worker-${module.global_constants.tags.Env}.towns.com"
  lb_dns_name                  = module.river_alb.river_node_lb_dns_name

  subdomain_name               = local.river_node_subdomain_name
}

data "cloudflare_zone" "zone" {
  name = module.global_constants.primary_hosted_zone_name
}

resource "cloudflare_record" "app_dns" {
  zone_id = data.cloudflare_zone.zone.id
  name    = "app-${module.global_constants.tags.Environment}"
  value   = "test-beta-ij4p.onrender.com"
  type    = "CNAME"
  ttl     = 60
}
