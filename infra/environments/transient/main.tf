# provider "aws" {
#   region  = "us-east-1"
# }

# provider "datadog" {
#   api_key = var.datadog_api_key
#   app_key = var.datadog_app_key
# }

provider "cloudflare" {
  api_token = var.cloudflare_terraform_api_token
}

terraform {
  required_providers {
    # aws = {
    #   source  = "hashicorp/aws"
    #   version = "~> 5.13.1"
    # }
    # datadog = {
    #   source = "DataDog/datadog"
    #   version = "3.32.0"
    # }
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
  reference_webapp_name = "test-beta"
  reference_sample_app_name = "sample-app"

  preview_app_cname_record_name = "${var.git_pr_number}.app-preview"
  preview_app_cname_record_value = "${local.reference_webapp_name}-pr-${var.git_pr_number}.onrender.com"

  preview_sample_app_cname_record_name = "${var.git_pr_number}.sample-app-preview"
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
