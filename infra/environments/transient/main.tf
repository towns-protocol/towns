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
    # aws = {
    #   source  = "hashicorp/aws"
    #   version = "~> 5.13.1"
    # }
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

data "terraform_remote_state" "transient_global_remote_state" {
  backend = "s3"

  config = {
    region  = "us-east-1"
    profile = "harmony-github-actions"
    bucket  = "here-not-there-terraform-state"
    key     = "env:/transient-global/default"
  }
}


# module "river_node" {
#   source = "../../modules/river-node"

#   node_subnets = data.terraform_remote_state.transient_global_remote_state.outputs.vpc.private_subnets
#   vpc_id       = data.terraform_remote_state.transient_global_remote_state.outputs.vpc.vpc_id

#   ecs_cluster = data.terraform_remote_state.transient_global_remote_state.outputs.river_ecs_cluster

#   alb_security_group_id  = data.terraform_remote_state.transient_global_remote_state.outputs.river_alb.security_group_id
#   alb_dns_name           = data.terraform_remote_state.transient_global_remote_state.outputs.river_alb.lb_dns_name
#   alb_https_listener_arn = data.terraform_remote_state.transient_global_remote_state.outputs.river_alb.lb_https_listener_arn

#   database_allowed_cidr_blocks = data.terraform_remote_state.transient_global_remote_state.outputs.vpc.private_subnets_cidr_blocks
#   database_subnets             = data.terraform_remote_state.transient_global_remote_state.outputs.vpc.database_subnets

#   l1_chain_id                  = 84531
#   push_notification_worker_url = "https://push-notification-worker-${module.global_constants.environment}.towns.com"


#   subdomain_name = "river1-${module.global_constants.environment}"
#   node_name      = "river1-${module.global_constants.environment}"
# }
