provider "aws" {
  region = "us-east-1"
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

data "cloudflare_zone" "zone" {
  name = module.global_constants.primary_hosted_zone_name
}

locals {
  reference_webapp_name     = "test-beta"
  reference_sample_app_name = "sample-app"

  preview_app_cname_record_name  = "${var.git_pr_number}.app-preview"
  preview_app_cname_record_value = "${local.reference_webapp_name}-pr-${var.git_pr_number}.onrender.com"

  preview_sample_app_cname_record_name  = "${var.git_pr_number}.sample-app-preview"
  preview_sample_app_cname_record_value = "${local.reference_sample_app_name}-pr-${var.git_pr_number}.onrender.com"

  transient_global_remote_state = module.global_constants.transient_global_remote_state.outputs

  global_remote_state = module.global_constants.global_remote_state.outputs

  create_db_cluster           = var.num_nodes > 0
  create_forked_chain_service = var.num_nodes > 0
  create_notification_service = var.num_nodes > 0
  create_load_testing_module  = var.num_nodes > 0
  base_chain_id               = 84532
  river_chain_id              = 6524490
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
  # These block numbers determien the earliest fork we can make. They will
  # outline critical events, such as contract deployments or upgrades.

  # TODO: Find the earliest fork block number for the base chain
  base_earliest_fork_block_number = "latest"

  # This is when the Stream Registry was first deployed
  river_earliest_fork_block_number = "1777392"
}

module "base_forked_chain_service" {
  source                 = "../../modules/forked-chain-service"
  count                  = local.create_forked_chain_service ? 1 : 0
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

  fork_block_number = var.is_clean_environment ? local.base_earliest_fork_block_number : "latest"

  service_subnets     = local.transient_global_remote_state.vpc.private_subnets
  fork_url_secret_arn = local.global_remote_state.base_chain_network_url_secret.arn
  vpc_id              = local.transient_global_remote_state.vpc.vpc_id
}

module "river_forked_chain_service" {
  source                 = "../../modules/forked-chain-service"
  count                  = local.create_forked_chain_service ? 1 : 0
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

  fork_block_number = var.is_clean_environment ? local.river_earliest_fork_block_number : "latest"

  service_subnets     = local.transient_global_remote_state.vpc.private_subnets
  fork_url_secret_arn = local.global_remote_state.river_chain_network_url_secret.arn
  vpc_id              = local.transient_global_remote_state.vpc.vpc_id
}


# module "notification_service" {
#   count  = local.create_notification_service ? 1 : 0
#   source = "../../modules/notification-service"

#   alb_security_group_id  = local.transient_global_remote_state.river_alb.security_group_id
#   alb_dns_name           = local.transient_global_remote_state.river_alb.lb_dns_name
#   alb_https_listener_arn = local.transient_global_remote_state.river_alb.lb_https_listener_arn

#   ecs_cluster = {
#     id   = local.transient_global_remote_state.river_ecs_cluster.id
#     name = local.transient_global_remote_state.river_ecs_cluster.name
#   }

#   git_pr_number = var.git_pr_number
#   is_transient  = true

#   subnets = local.transient_global_remote_state.vpc.private_subnets
#   vpc_id  = local.transient_global_remote_state.vpc.vpc_id

#   vapid_key_secret_arn = local.transient_global_remote_state.notification_vapid_key.arn
#   vapid_subject        = "mailto:test@towns.com"

#   river_node_db = local.create_db_cluster ? module.river_db_cluster[0] : null
# }


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

  is_multi_node = var.num_nodes > 1

  log_level                       = var.river_node_log_level
  base_chain_id                   = local.base_chain_id
  base_chain_network_url_override = module.base_forked_chain_service[0].network_url

  river_chain_id                   = local.river_chain_id
  river_chain_network_url_override = module.river_forked_chain_service[0].network_url

  ecs_cluster = {
    id   = local.transient_global_remote_state.river_ecs_cluster.id
    name = local.transient_global_remote_state.river_ecs_cluster.name
  }

  notification_service_url = "https://push-notification-worker-test-beta.towns.com"

  alb_security_group_id  = local.transient_global_remote_state.river_alb.security_group_id
  alb_dns_name           = local.transient_global_remote_state.river_alb.lb_dns_name
  alb_https_listener_arn = local.transient_global_remote_state.river_alb.lb_https_listener_arn
}

# module "loadtest" {
#   count              = local.create_load_testing_module ? 1 : 0
#   source             = "../../modules/loadtest"
#   vpc_id             = local.transient_global_remote_state.vpc.vpc_id
#   public_subnets     = local.transient_global_remote_state.vpc.public_subnets
#   private_subnets    = local.transient_global_remote_state.vpc.private_subnets
#   base_chain_rpc_url = module.base_forked_chain_service[0].network_url
#   river_node_url     = "https://river1-${terraform.workspace}.${module.global_constants.primary_hosted_zone_name}"
# }

