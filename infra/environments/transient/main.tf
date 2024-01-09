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

locals {
  create_db_cluster = var.num_nodes > 0
}

module "river_db_cluster" {
  source           = "../../modules/river-db-cluster"
  database_subnets = local.transient_global_remote_state.vpc.database_subnets
  vpc_id           = local.transient_global_remote_state.vpc.vpc_id

  is_transient = true

  # for now, we're just hardcoding this logic here.
  # if a transient environment is multi-node, then it's a fresh & clean db.
  # if it's single-node, then it's a cow clone.
  is_cloned = var.is_db_cloned

  count                     = local.create_db_cluster ? 1 : 0
  pgadmin_security_group_id = module.global_constants.transient_global_remote_state.outputs.pgadmin_security_group_id


}

module "river_node" {
  source      = "../../modules/river-node"
  count       = var.num_nodes
  node_number = count.index + 1

  river_node_db = local.create_db_cluster ? module.river_db_cluster[0] : null

  is_transient  = true
  git_pr_number = var.git_pr_number

  node_subnets = local.transient_global_remote_state.vpc.private_subnets
  vpc_id       = local.transient_global_remote_state.vpc.vpc_id

  is_multi_node = var.num_nodes > 1

  ecs_cluster = {
    id   = local.transient_global_remote_state.river_ecs_cluster.id
    name = local.transient_global_remote_state.river_ecs_cluster.name
  }

  # TODO: generalize this to env name once we start deploying transient workers
  push_notification_worker_url = "https://push-notification-worker-test-beta.towns.com"

  alb_security_group_id  = local.transient_global_remote_state.river_alb.security_group_id
  alb_dns_name           = local.transient_global_remote_state.river_alb.lb_dns_name
  alb_https_listener_arn = local.transient_global_remote_state.river_alb.lb_https_listener_arn
}
