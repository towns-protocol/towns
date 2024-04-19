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

module "system_parameters" {
  source = "../../modules/river-system-parameters"
  count  = local.create_system_parameters ? 1 : 0
}


data "cloudflare_zone" "zone" {
  name = module.global_constants.primary_hosted_zone_name
}

locals {
  reference_webapp_name     = "gamma"
  reference_sample_app_name = "sample-gamma"

  preview_app_cname_record_name  = "${var.git_pr_number}.app-preview"
  preview_app_cname_record_value = "${local.reference_webapp_name}-pr-${var.git_pr_number}.onrender.com"

  preview_sample_app_cname_record_name  = "${var.git_pr_number}.sample-app-preview"
  preview_sample_app_cname_record_value = "${local.reference_sample_app_name}-pr-${var.git_pr_number}.onrender.com"

  transient_global_remote_state = module.global_constants.transient_global_remote_state.outputs

  global_remote_state = module.global_constants.global_remote_state.outputs

  create_db_cluster        = var.num_nodes > 0
  create_anvil_service     = var.num_nodes > 0
  create_system_parameters = var.num_nodes > 0
  create_nlb               = var.num_nodes > 0
  base_chain_id            = 31337
  river_chain_id           = 31338
}

resource "aws_iam_user_policy_attachment" "river_system_parameters" {
  count      = local.create_system_parameters ? 1 : 0
  policy_arn = local.create_system_parameters ? module.system_parameters[0].river_system_parameters_policy.arn : ""
  user       = local.transient_global_remote_state.render_webapp_user.name
}

resource "cloudflare_record" "app_dns" {
  zone_id = data.cloudflare_zone.zone.id
  name    = local.preview_app_cname_record_name
  value   = local.preview_app_cname_record_value
  type    = "CNAME"
  ttl     = 60
}

resource "cloudflare_record" "sample_app_dns" {
  zone_id = data.cloudflare_zone.zone.id
  name    = local.preview_sample_app_cname_record_name
  value   = local.preview_sample_app_cname_record_value
  type    = "CNAME"
  ttl     = 60
}

module "river_db_cluster" {
  source           = "../../modules/river-db-cluster"
  database_subnets = local.transient_global_remote_state.vpc.database_subnets
  vpc_id           = local.transient_global_remote_state.vpc.vpc_id

  is_transient = true

  # for now, we're just hardcoding this logic here.
  # if a transient environment is multi-node, then it's a fresh & clean db.
  # if it's single-node, then it's a cow clone.
  is_cloned = !var.is_clean_environment

  count                     = local.create_db_cluster ? 1 : 0
  pgadmin_security_group_id = module.global_constants.transient_global_remote_state.outputs.pgadmin_security_group_id
}

locals {
  river_registry_contract_address = "0xf18E98D36A6bd1aDb52F776aCc191E69B491c070"
}

module "base_anvil_service" {
  source                 = "../../modules/anvil-service"
  count                  = local.create_anvil_service ? 1 : 0
  alb_security_group_id  = local.transient_global_remote_state.river_alb.security_group_id
  alb_dns_name           = local.transient_global_remote_state.river_alb.lb_dns_name
  alb_https_listener_arn = local.transient_global_remote_state.river_alb.lb_https_listener_arn

  block_time = 2
  chain_id   = local.base_chain_id
  chain_name = "base"
  ecs_cluster = {
    id   = local.transient_global_remote_state.river_ecs_cluster.id
    name = local.transient_global_remote_state.river_ecs_cluster.name
  }


  service_subnets = local.transient_global_remote_state.vpc.private_subnets
  vpc_id          = local.transient_global_remote_state.vpc.vpc_id
}

module "river_anvil_service" {
  source                 = "../../modules/anvil-service"
  count                  = local.create_anvil_service ? 1 : 0
  alb_security_group_id  = local.transient_global_remote_state.river_alb.security_group_id
  alb_dns_name           = local.transient_global_remote_state.river_alb.lb_dns_name
  alb_https_listener_arn = local.transient_global_remote_state.river_alb.lb_https_listener_arn

  block_time = 2
  chain_id   = local.river_chain_id
  chain_name = "river"
  ecs_cluster = {
    id   = local.transient_global_remote_state.river_ecs_cluster.id
    name = local.transient_global_remote_state.river_ecs_cluster.name
  }


  service_subnets = local.transient_global_remote_state.vpc.private_subnets
  vpc_id          = local.transient_global_remote_state.vpc.vpc_id
}

locals {
  # TODO: make this dynamic on gamma, based on the node number.
  nlb_root_domain_name = "river-nlb-${var.git_pr_number}.nodes.transient"
}

module "river_nlb" {
  source       = "../../modules/river-nlb"
  count        = local.create_nlb ? 1 : 0
  subnets      = local.transient_global_remote_state.vpc.public_subnets
  vpc_id       = local.transient_global_remote_state.vpc.vpc_id
  dns_name     = local.nlb_root_domain_name
  is_transient = true
}

module "river_node" {
  source      = "../../modules/river-node"
  count       = var.num_nodes
  node_number = count.index + 1

  river_node_ssl_cert_secret_arn = local.transient_global_remote_state.river_node_ssl_cert_secret_arn
  dns_name                       = "river${count.index + 1}-${var.git_pr_number}.nodes.transient"

  river_node_db = local.create_db_cluster ? module.river_db_cluster[0] : null

  is_transient  = true
  git_pr_number = var.git_pr_number

  public_subnets  = local.transient_global_remote_state.vpc.public_subnets
  private_subnets = local.transient_global_remote_state.vpc.private_subnets
  vpc_id          = local.transient_global_remote_state.vpc.vpc_id

  log_level                       = var.river_node_log_level
  base_chain_id                   = local.base_chain_id
  base_chain_network_url_override = module.base_anvil_service[0].network_url

  river_chain_id                   = local.river_chain_id
  river_chain_network_url_override = module.river_anvil_service[0].network_url

  ecs_cluster = {
    id   = local.transient_global_remote_state.river_ecs_cluster.id
    name = local.transient_global_remote_state.river_ecs_cluster.name
  }

  system_parameters = local.create_system_parameters ? module.system_parameters[0] : null

  lb = module.river_nlb[0]
}
