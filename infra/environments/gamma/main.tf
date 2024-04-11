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
  cidr = "10.0.0.0/16"

  azs = ["us-east-1a", "us-east-1b"]

  # num ips in subnet = 2^(32 - 19) = 2^13 = 8192
  public_subnets = ["10.0.0.0/19", "10.0.32.0/19"]

  # num ips in subnet = 2^(32 - 18) = 2^14 = 16384
  private_subnets = ["10.0.64.0/18", "10.0.128.0/18"]

  # num ips in subnet = 2^(32 - 22) = 2^10 = 1024
  database_subnets = ["10.0.192.0/22", "10.0.196.0/22"]

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

resource "aws_ecs_cluster" "river_ecs_cluster" {
  name = "${terraform.workspace}-river-ecs-cluster"
  tags = module.global_constants.tags
}

module "river_db_cluster" {
  source           = "../../modules/river-db-cluster"
  database_subnets = module.vpc.database_subnets
  vpc_id           = module.vpc.vpc_id
}

module "river_node_ssl_cert" {
  source                       = "../../modules/river-node-ssl-cert"
  subnet_ids                   = module.vpc.private_subnets
  common_name                  = "*.nodes.${terraform.workspace}.towns.com"
  challenge_dns_record_fq_name = "_acme-challenge.nodes.${terraform.workspace}.towns.com"
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

resource "aws_secretsmanager_secret" "notification_vapid_key" {
  name        = "notification-vapid-keypair-${terraform.workspace}"
  description = "Key-pair for notification service"
}

locals {
  num_nodes = 11
}

module "system_parameters" {
  source = "../../modules/river-system-parameters"

  space_factory_contract_address_default_value       = "0x968696BC59431Ef085441641f550C8e2Eaca8BEd"
  river_registry_contract_address_default_value      = "0xf18E98D36A6bd1aDb52F776aCc191E69B491c070"
  wallet_link_contract_address_default_value         = "0x2cF3e30BaCd44272Ee1494659cf895022786AAF3"
  entitlement_checker_contract_address_default_value = "0x46297EA7c3895d595366551bdE731B7f0B3cF48e"
}

module "river_node" {
  source      = "../../modules/river-node"
  count       = local.num_nodes
  node_number = count.index + 1

  river_node_ssl_cert_secret_arn = module.river_node_ssl_cert.river_node_ssl_cert_secret_arn
  dns_name                       = "river${count.index + 1}.nodes.${terraform.workspace}"

  river_node_db = module.river_db_cluster

  public_subnets  = module.vpc.public_subnets
  private_subnets = module.vpc.private_subnets
  vpc_id          = module.vpc.vpc_id

  system_parameters = module.system_parameters

  base_chain_id  = 84532
  river_chain_id = 6524490

  ecs_cluster = {
    id   = aws_ecs_cluster.river_ecs_cluster.id
    name = aws_ecs_cluster.river_ecs_cluster.name
  }
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

  vapid_key_secret_arn = aws_secretsmanager_secret.notification_vapid_key.arn

  # TODO: check with brian & team to see who runs this account
  vapid_subject = "mailto:support@towns.com"

  river_node_db  = module.river_db_cluster
  river_node_url = module.global_constants.nodes_metadata[0].url
}

module "eth_balance_monitor" {
  source = "../../modules/eth-balance-monitor"

  subnet_ids                      = module.vpc.private_subnets
  river_registry_contract_address = module.system_parameters.river_registry_contract_address_parameter.value
}

module "loadtest" {
  source          = "../../modules/loadtest"
  vpc_id          = module.vpc.vpc_id
  public_subnets  = module.vpc.public_subnets
  private_subnets = module.vpc.private_subnets
  river_node_url  = module.global_constants.nodes_metadata[0].url
  is_forked_anvil = false
}

data "cloudflare_zone" "zone" {
  name = module.global_constants.primary_hosted_zone_name
}

resource "cloudflare_record" "app_dns" {
  zone_id = data.cloudflare_zone.zone.id
  name    = "app.${terraform.workspace}"
  value   = "gamma-rw7y.onrender.com"
  type    = "CNAME"
  ttl     = 60
}

resource "cloudflare_record" "sample_app_dns" {
  zone_id = data.cloudflare_zone.zone.id
  name    = "sample-app.${terraform.workspace}"
  value   = "sample-gamma.onrender.com"
  type    = "CNAME"
  ttl     = 60
}
