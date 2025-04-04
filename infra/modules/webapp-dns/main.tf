terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }

  backend "s3" {}

  required_version = ">= 1.0.3"
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

variable "dns_name" {
  description = "The DNS name for the application"
  type        = string
}

variable "dns_value" {
  description = "The DNS value for the application"
  type        = string
}

variable "proxied" {
  description = "Whether the DNS record should be proxied through Cloudflare"
  type        = bool
  default     = false
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

variable "enable_cnd_caching" {
  description = "Enable CDN caching for the application"
  type        = bool
  default     = false
}

data "cloudflare_zone" "zone" {
  name = module.global_constants.primary_hosted_zone_name
}

module "global_constants" {
  source = "../global-constants"
}


resource "cloudflare_record" "app_dns" {
  zone_id = data.cloudflare_zone.zone.id
  name    = var.dns_name
  value   = var.dns_value
  type    = "CNAME"
  ttl     = var.proxied ? 1 : 60
  proxied = var.proxied
}

resource "cloudflare_page_rule" "cdn_cache_assets" {
  count   = var.enable_cnd_caching ? 1 : 0
  zone_id = data.cloudflare_zone.zone.id
  target  = "${var.dns_name}.${module.global_constants.primary_hosted_zone_name}/assets/*"
  actions {
    cache_ttl_by_status {
      codes = "200-299"
      ttl   = 604800 # 1 week
    }
    cache_ttl_by_status {
      codes = "300-399"
      ttl   = 60
    }
    cache_ttl_by_status {
      codes = "400-403"
      ttl   = -1
    }
    cache_ttl_by_status {
      codes = "404"
      ttl   = 30
    }
    cache_ttl_by_status {
      codes = "405-499"
      ttl   = -1
    }
    cache_ttl_by_status {
      codes = "500-599"
      ttl   = 0
    }
  }
}

resource "cloudflare_page_rule" "cdn_cache_main_sw" {
  count   = var.enable_cnd_caching ? 1 : 0
  zone_id = data.cloudflare_zone.zone.id
  target  = "${var.dns_name}.${module.global_constants.primary_hosted_zone_name}/main-sw.js"
  actions {
    cache_ttl_by_status {
      codes = "200-299"
      ttl   = 60
    }
  }
}
