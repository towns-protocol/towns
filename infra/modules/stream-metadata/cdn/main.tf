module "global_constants" {
  source = "../../global-constants"
}

locals {
  service_name = "stream-metadata-cloudfront-distribution"
  local_name   = "${local.service_name}-${terraform.workspace}"

  global_remote_state = module.global_constants.global_remote_state.outputs

  tags = merge(
    module.global_constants.tags,
    {
      Service = local.service_name
    }
  )
}

data "aws_acm_certificate" "cert" {
  domain = module.global_constants.river_delivery_hosted_zone_name
}

locals {
  origin_id                                     = var.origin_domain_name // just need it to be unique 
  origin_request_policy_managed_all_viewer      = "216adef6-5c7f-47e4-b989-5492eafa07d3"
  cache_policy_use_origin_cache_control_headers = "83da9c7e-98b4-4e11-a168-04f0df8e2c65"
}

resource "aws_cloudfront_distribution" "this" {
  comment      = "CDN for stream-metadata on ${terraform.workspace}"
  enabled      = true
  http_version = "http3"

  viewer_certificate {
    acm_certificate_arn      = data.aws_acm_certificate.cert.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  aliases = [var.alias_domain_name]

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"] // TODO: can we allow HEAD and OPTIONS into the server?
    cached_methods   = ["GET", "HEAD", "OPTIONS"] // TODO: are these the correct cached methods? is it bad to cache OPTIONS?
    target_origin_id = local.origin_id

    viewer_protocol_policy = "https-only"

    // TODO: AWS says query strings are not included in the cache key. we should validate this.
    cache_policy_id = local.cache_policy_use_origin_cache_control_headers

    // TODO: Aws says all parameters will be forwarded to the origin. we should validate this.
    origin_request_policy_id = local.origin_request_policy_managed_all_viewer

    compress    = true
    max_ttl     = 0 // cache nothing
    default_ttl = 0 // cache nothing
    min_ttl     = 0 // cache nothing
  }

  origin {
    domain_name = var.origin_domain_name
    origin_id   = local.origin_id

    custom_origin_config {
      http_port                = 80
      https_port               = 443
      origin_protocol_policy   = "http-only"
      origin_ssl_protocols     = ["TLSv1.2"]
      origin_keepalive_timeout = 5
      origin_read_timeout      = 30
    }
  }

  tags = local.tags
}

output "domain_name" {
  value = aws_cloudfront_distribution.this.domain_name
}

output "id" {
  value = aws_cloudfront_distribution.this.id
}

output "arn" {
  value = aws_cloudfront_distribution.this.arn
}
