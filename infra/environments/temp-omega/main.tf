provider "aws" {
  region = "us-east-1"
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
      version = ">= 5.13.1"
    }
    datadog = {
      source  = "DataDog/datadog"
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
  global_remote_state = module.global_constants.global_remote_state.outputs
}

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "river-vpc-${terraform.workspace}"
  cidr = "10.5.0.0/16"

  azs = ["us-east-1a", "us-east-1b"]

  # num ips in subnet = 2^(32 - 19) = 2^13 = 8192
  public_subnets = ["10.5.0.0/19", "10.5.32.0/19"]

  # num ips in subnet = 2^(32 - 18) = 2^14 = 16384
  private_subnets = ["10.5.64.0/18", "10.5.128.0/18"]

  # num ips in subnet = 2^(32 - 22) = 2^10 = 1024
  database_subnets = ["10.5.192.0/22", "10.5.196.0/22"]

  enable_vpn_gateway     = false
  enable_nat_gateway     = true
  single_nat_gateway     = true
  one_nat_gateway_per_az = false

  tags = module.global_constants.tags

  enable_dns_hostnames = true
}

resource "aws_ecs_cluster" "river_ecs_cluster" {
  name = "${terraform.workspace}-river-ecs-cluster"
  tags = module.global_constants.tags
}

module "stream_metadata" {
  source = "../../modules/stream-metadata"

  river_env        = "omega"
  docker_image_tag = "a6e1394aa7883d8ac20a36ea6a39e609525c869e"

  vpc_id = module.vpc.vpc_id

  ecs_cluster = {
    id   = aws_ecs_cluster.river_ecs_cluster.id
    name = aws_ecs_cluster.river_ecs_cluster.name
  }

  river_chain_rpc_url_secret_arn = local.global_remote_state.river_mainnet_rpc_url_secret.arn
  base_chain_rpc_url_secret_arn  = local.global_remote_state.base_mainnet_rpc_url_secret.arn

  origin_shield_enabled = true

  private_subnets = module.vpc.private_subnets
  public_subnets  = module.vpc.public_subnets
}
