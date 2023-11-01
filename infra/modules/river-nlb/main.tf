module "global_constants" {
  source = "../global-constants"
}

data "aws_acm_certificate" "primary_hosted_zone_cert" {
  domain = module.global_constants.primary_hosted_zone_name
}

data "aws_vpc" "vpc" {
  id = var.vpc_id
}

module "river_nlb_sg" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "${module.global_constants.environment}_river_nlb_sg"
  description = "Security group river load balancer"
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
}

module "river_nlb" {
  source  = "terraform-aws-modules/alb/aws"
  version = "9.1.0"

  name               = "${module.global_constants.environment}-river-nlb"
  load_balancer_type = "network"

  vpc_id          = var.vpc_id
  subnets         = var.subnets
  security_groups = [module.river_nlb_sg.security_group_id]

  listeners = {
    tls = {
      port     = 443
      protocol = "TLS"
      forward = {
        target_group_key = "blue"
      }
      certificate_arn = data.aws_acm_certificate.primary_hosted_zone_cert.arn
      alpn_policy = "HTTP2Preferred"
    },
  }

  target_groups = {
    blue = {
      name = "${module.global_constants.environment}-river-node-blue"
      port     = 80
      protocol = "TCP"
      target_type = "ip"
      create_attachment = false
    }
    green = {
      name = "${module.global_constants.environment}-river-node-green"
      port     = 80
      protocol = "TCP"
      target_type = "ip"
      create_attachment = false
    }
  }


  tags = merge(
    module.global_constants.tags,
    {
      Service = "river-node-load-balancer"
      Instance = "${var.river_node_name}-load-balancer"
    }
  )

  # setting it to 30 minutes because river request context keeps getting cancelled otherwise.
  # this is done in order to support long-poll requests.
  idle_timeout = 1800
}

