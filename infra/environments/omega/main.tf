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

locals {
  global_remote_state = module.global_constants.global_remote_state.outputs
}

module "system_parameters" {
  source = "../../modules/river-system-parameters"
}

locals {
  num_archive_nodes = 2
  num_stream_nodes  = 0
}

resource "aws_ecs_cluster" "river_ecs_cluster" {
  name = "${terraform.workspace}-river-ecs-cluster"
  tags = module.global_constants.tags
}
module "stream_metadata" {
  source    = "../../modules/stream-metadata"
  river_env = terraform.workspace

  vpc_id = module.vpc.vpc_id

  ecs_cluster = {
    id   = aws_ecs_cluster.river_ecs_cluster.id
    name = aws_ecs_cluster.river_ecs_cluster.name
  }

  river_chain_rpc_url_secret_arn = local.global_remote_state.river_mainnet_rpc_url_secret.arn
  base_chain_rpc_url_secret_arn  = local.global_remote_state.base_mainnet_rpc_url_secret.arn

  private_subnets = module.vpc.private_subnets
  public_subnets  = module.vpc.public_subnets
}

module "network_health_monitor" {
  source = "../../modules/network-health-monitor"

  subnet_ids = module.vpc.private_subnets

  river_registry_contract_address = module.system_parameters.river_registry_contract_address_parameter.value
  base_registry_contract_address  = module.system_parameters.entitlement_checker_contract_address_parameter.value // entitlement checker is on base registry
  space_owner_contract_address    = module.system_parameters.space_owner_contract_address_parameter.value

  base_chain_rpc_url_secret_arn  = local.global_remote_state.base_mainnet_metrics_rpc_url_secret.arn
  river_chain_rpc_url_secret_arn = local.global_remote_state.river_mainnet_rpc_url_secret.arn
}
module "operator_logs" {
  source      = "../../modules/operator-logs"
  bucket_name = "figment-logs"
  user_name   = "figment"
}

locals {
  gcp_project_id = "hnt-live-${terraform.workspace}"
  gcp_region     = "us-east4"
  gcp_zones      = ["us-east4-a", "us-east4-b", "us-east4-c"]
}

module "gcp_env" {
  source = "../../modules/gcp-env"

  project_id                     = local.gcp_project_id
  region                         = local.gcp_region
  zones                          = local.gcp_zones
  cloudflare_terraform_api_token = var.cloudflare_terraform_api_token
  gcloud_credentials             = file("./gcloud-credentials.json")

  river_node_config = {
    num_archive_nodes = local.num_archive_nodes
    num_stream_nodes  = local.num_stream_nodes
  }
}
