module "global_constants" {
  source = "../../global-constants"
}

data "aws_vpc" "vpc" {
  id = var.vpc_id
}

locals {
  service_name = "stream-metadata-alb"
  local_name   = "${terraform.workspace}-${local.service_name}"
  tags = merge(
    module.global_constants.tags,
    {
      Service = local.service_name
    }
  )
}

module "alb_sg" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "${local.local_name}-sg"
  description = "Security group for ${local.local_name}"
  vpc_id      = var.vpc_id

  ingress_cidr_blocks = ["0.0.0.0/0"] # public internet
  ingress_rules = [
    "https-443-tcp",
    "http-80-tcp",
  ]

  computed_egress_with_cidr_blocks = [
    {
      rule        = "all-all"
      cidr_blocks = data.aws_vpc.vpc.cidr_block
      # The load balancer will only be allowed to speak to other resources in the VPC
    },
  ]

  number_of_computed_egress_with_cidr_blocks = 1

  tags = local.tags
}

module "alb" {
  source  = "terraform-aws-modules/alb/aws"
  version = "6.0.0"

  name               = local.local_name
  load_balancer_type = "application"

  vpc_id          = var.vpc_id
  subnets         = var.subnets
  security_groups = [module.alb_sg.security_group_id]

  tags = local.tags
}


data "aws_acm_certificate" "primary_hosted_zone_cert" {
  domain = module.global_constants.river_delivery_hosted_zone_name
}

resource "aws_lb_listener" "https_listener" {
  load_balancer_arn = module.alb.lb_arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"

  certificate_arn = data.aws_acm_certificate.primary_hosted_zone_cert.arn

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      status_code  = "204" // No Content
    }
  }
}

output "security_group_id" {
  value = module.alb_sg.security_group_id
}

output "https_listener_arn" {
  value = aws_lb_listener.https_listener.arn
}

output "dns_name" {
  value = module.alb.lb_dns_name
}
