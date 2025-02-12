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
  cidr = "10.1.0.0/16"

  azs = ["us-east-1a", "us-east-1b"]

  # num ips in subnet = 2^(32 - 19) = 2^13 = 8192
  public_subnets = ["10.1.0.0/19", "10.1.32.0/19"]

  # num ips in subnet = 2^(32 - 18) = 2^14 = 16384
  private_subnets = ["10.1.64.0/18", "10.1.128.0/18"]

  # num ips in subnet = 2^(32 - 22) = 2^10 = 1024
  database_subnets = ["10.1.192.0/22", "10.1.196.0/22"]

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

module "river_db_post_stream_migration" {
  source                    = "../../modules/river-db-cluster"
  database_subnets          = module.vpc.database_subnets
  vpc_id                    = module.vpc.vpc_id
  pgadmin_security_group_id = module.pgadmin.security_group_id
  cluster_name_suffix       = "post-stream-migration"
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

locals {
  num_full_nodes      = 10
  num_archive_nodes   = 0
  archive_enabled     = false
  global_remote_state = module.global_constants.global_remote_state.outputs
  base_chain_id       = 84532
  river_chain_id      = 6524490
  scrub_duration      = 900000000000
}

module "system_parameters" {
  source = "../../modules/river-system-parameters"
}

module "river_nlb" {
  source  = "../../modules/river-nlb"
  count   = local.num_full_nodes
  subnets = module.vpc.public_subnets
  vpc_id  = module.vpc.vpc_id
  nlb_id  = tostring(count.index + 1)
}

module "node_metadata" {
  source = "../../modules/river-node-metadata"

  num_full_nodes    = local.num_full_nodes
  num_archive_nodes = local.num_archive_nodes
}

module "stream_metadata" {
  source    = "../../modules/stream-metadata"
  river_env = terraform.workspace

  vpc_id = module.vpc.vpc_id

  ecs_cluster = {
    id   = aws_ecs_cluster.river_ecs_cluster.id
    name = aws_ecs_cluster.river_ecs_cluster.name
  }

  river_chain_rpc_url_secret_arn = local.global_remote_state.river_sepolia_rpc_url_secret.arn
  base_chain_rpc_url_secret_arn  = local.global_remote_state.base_sepolia_rpc_url_secret.arn

  private_subnets = module.vpc.private_subnets
  public_subnets  = module.vpc.public_subnets
}

locals {
  river_database_isolation_level = "READ COMMITTED"
  river_max_db_connections       = 50
}

module "river_node" {
  source = "../../modules/river-node"
  count  = local.num_full_nodes

  node_metadata = module.node_metadata.full_nodes[count.index]

  enable_debug_endpoints  = true
  migrate_stream_creation = true

  river_node_ssl_cert_secret_arn = module.river_node_ssl_cert.river_node_ssl_cert_secret_arn

  river_node_db = module.river_db_post_stream_migration

  river_database_isolation_level = local.river_database_isolation_level
  max_db_connections             = local.river_max_db_connections

  public_subnets  = module.vpc.public_subnets
  private_subnets = module.vpc.private_subnets
  vpc_id          = module.vpc.vpc_id

  system_parameters = module.system_parameters

  base_chain_rpc_url_secret_arn  = local.global_remote_state.base_sepolia_rpc_url_secret.arn
  river_chain_rpc_url_secret_arn = local.global_remote_state.river_sepolia_rpc_url_secret.arn
  chainsstring_secret_arn        = local.global_remote_state.gamma_chainsstring_secret.arn

  base_chain_id  = local.base_chain_id
  river_chain_id = local.river_chain_id

  scrub_duration = local.scrub_duration
  enable_mls     = false

  ecs_cluster = {
    id   = aws_ecs_cluster.river_ecs_cluster.id
    name = aws_ecs_cluster.river_ecs_cluster.name
  }

  lb = module.river_nlb[count.index]

  cpu    = 512
  memory = 1024
}

module "river_notification_service" {
  source = "../../modules/river-notification-service"

  alb_security_group_id  = module.river_alb.security_group_id
  alb_dns_name           = module.river_alb.lb_dns_name
  alb_https_listener_arn = module.river_alb.lb_https_listener_arn

  vpc_id          = module.vpc.vpc_id
  db_subnets      = module.vpc.database_subnets
  private_subnets = module.vpc.private_subnets

  ecs_cluster = {
    id   = aws_ecs_cluster.river_ecs_cluster.id
    name = aws_ecs_cluster.river_ecs_cluster.name
  }

  apns_auth_key_secret_arn  = local.global_remote_state.notification_apns_auth_key_secret.arn
  apns_towns_app_identifier = "com.towns.ios.alpha"

  pgadmin_security_group_id      = module.pgadmin.security_group_id
  river_chain_id                 = local.river_chain_id
  river_chain_rpc_url_secret_arn = local.global_remote_state.river_sepolia_rpc_url_secret.arn
  system_parameters              = module.system_parameters
}

module "network_health_monitor" {
  source = "../../modules/network-health-monitor"

  subnet_ids                      = module.vpc.private_subnets
  river_registry_contract_address = module.system_parameters.river_registry_contract_address_parameter.value
  base_registry_contract_address  = module.system_parameters.entitlement_checker_contract_address_parameter.value // entitlement checker is on base registry
  space_owner_contract_address    = module.system_parameters.space_owner_contract_address_parameter.value

  base_chain_rpc_url_secret_arn  = local.global_remote_state.base_sepolia_metrics_rpc_url_secret.arn
  river_chain_rpc_url_secret_arn = local.global_remote_state.river_sepolia_rpc_url_secret.arn
}

module "stress_tests" {
  source = "../../modules/stress-tests"

  vpc_id          = module.vpc.vpc_id
  private_subnets = module.vpc.private_subnets
  public_subnets  = module.vpc.public_subnets

  base_chain_rpc_url_secret_arn  = local.global_remote_state.base_sepolia_rpc_url_secret.arn
  river_chain_rpc_url_secret_arn = local.global_remote_state.river_sepolia_rpc_url_secret.arn

  space_id            = "109bd136d3155316d5d6dfcd4f87d5ee1a3ea8f22d0000000000000000000000"
  announce_channel_id = "209bd136d3155316d5d6dfcd4f87d5ee1a3ea8f22d3ea9c4273da5a77d10de58"
  channel_ids         = "209bd136d3155316d5d6dfcd4f87d5ee1a3ea8f22dcc16da7e96af829d8d73be,209bd136d3155316d5d6dfcd4f87d5ee1a3ea8f22d56888a483afd0412ddb85c"
}

module "metrics_aggregator" {
  source = "../../modules/metrics-aggregator"

  vpc_id                         = module.vpc.vpc_id
  river_chain_rpc_url_secret_arn = local.global_remote_state.river_sepolia_rpc_url_secret.arn
  subnets                        = module.vpc.private_subnets
  ecs_cluster = {
    id   = aws_ecs_cluster.river_ecs_cluster.id
    name = aws_ecs_cluster.river_ecs_cluster.name
  }
}

data "cloudflare_zone" "zone" {
  name = module.global_constants.primary_hosted_zone_name
}

resource "cloudflare_record" "app_dns" {
  zone_id = data.cloudflare_zone.zone.id
  name    = "app.${terraform.workspace}"
  value   = "towns-server-alpha.onrender.com"
  type    = "CNAME"
  ttl     = 60
}
