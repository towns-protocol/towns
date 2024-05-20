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

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "river-vpc-${terraform.workspace}"
  cidr = "10.4.0.0/16"

  azs = ["us-east-1a", "us-east-1b"]

  # num ips in subnet = 2^(32 - 19) = 2^13 = 8192
  public_subnets = ["10.4.0.0/19", "10.4.32.0/19"]

  # num ips in subnet = 2^(32 - 18) = 2^14 = 16384
  private_subnets = ["10.4.64.0/18", "10.4.128.0/18"]

  # num ips in subnet = 2^(32 - 22) = 2^10 = 1024
  database_subnets = ["10.4.192.0/22", "10.4.196.0/22"]

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

module "river_db_cluster" {
  source           = "../../modules/river-db-cluster"
  database_subnets = module.vpc.database_subnets
  vpc_id           = module.vpc.vpc_id
}

resource "aws_ecs_cluster" "river_ecs_cluster" {
  name = "${terraform.workspace}-river-ecs-cluster"
  tags = module.global_constants.tags
}

module "pgadmin" {
  source          = "../../modules/pgadmin"
  vpc_id          = module.vpc.vpc_id
  public_subnets  = module.vpc.public_subnets
  private_subnets = module.vpc.private_subnets

  ecs_cluster = {
    id   = aws_ecs_cluster.river_ecs_cluster.id
    name = aws_ecs_cluster.river_ecs_cluster.name
  }

  alb_security_group_id  = module.river_alb.security_group_id
  alb_dns_name           = module.river_alb.lb_dns_name
  alb_https_listener_arn = module.river_alb.lb_https_listener_arn
}

locals {
  global_remote_state = module.global_constants.global_remote_state.outputs
}

module "system_parameters" {
  source = "../../modules/river-system-parameters"
}

module "notification_service" {
  source = "../../modules/notification-service"

  alb_security_group_id  = module.river_alb.security_group_id
  alb_dns_name           = module.river_alb.lb_dns_name
  alb_https_listener_arn = module.river_alb.lb_https_listener_arn

  ecs_cluster = {
    id   = aws_ecs_cluster.river_ecs_cluster.id
    name = aws_ecs_cluster.river_ecs_cluster.name
  }

  subnets = module.vpc.private_subnets
  vpc_id  = module.vpc.vpc_id

  vapid_key_secret_arn     = local.global_remote_state.notification_vapid_key_secret.arn
  apns_auth_key_secret_arn = local.global_remote_state.notification_apns_auth_key_secret.arn

  vapid_subject = "mailto:support@towns.com"

  river_node_db = module.river_db_cluster

  # TODO: use an actual node url once we're up on mainnet
  river_node_url = ""
}

module "eth_balance_monitor" {
  source = "../../modules/eth-balance-monitor"

  subnet_ids = module.vpc.private_subnets

  # TODO: make sure this is dynamically pulled from ssm, and not hardcoded in terraform
  river_registry_contract_address = module.system_parameters.river_registry_contract_address_parameter.value

  # TODO: acquire actual rpc urls and place them in the secrets
  base_chain_rpc_url_secret_arn  = local.global_remote_state.base_mainnet_rpc_url_secret.arn
  river_chain_rpc_url_secret_arn = local.global_remote_state.river_mainnet_rpc_url_secret.arn
}

# TODO: setup uptime monitors for mainnet nodes
# TODO: standardize wallet balance alerts for gamma, and reuse them for mainnet in terraform
