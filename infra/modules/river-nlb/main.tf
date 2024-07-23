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

  required_version = ">= 1.0.3"
}

module "global_constants" {
  source = "../global-constants"
}

locals {
  service_name    = "river-nlb-${terraform.workspace}"
  nlb_name_suffix = var.nlb_id == "" ? "" : "${var.nlb_id}-"

  nlb_name = "${local.nlb_name_suffix}${local.service_name}"

  global_remote_state = module.global_constants.global_remote_state.outputs

  tags = merge(
    module.global_constants.tags,
    {
      Service = local.service_name
      Name    = local.nlb_name
    }
  )

}

##################################################################
# Network Load Balancer
##################################################################

module "nlb" {

  source = "terraform-aws-modules/alb/aws"

  name = local.nlb_name

  load_balancer_type = "network"
  vpc_id             = var.vpc_id
  subnets            = var.subnets

  enable_cross_zone_load_balancing = true

  security_groups = [aws_security_group.nlb_security_group.id]

  enable_deletion_protection = true

  tags = local.tags
}


##################################################################
# Supporting Resources
##################################################################

resource "aws_security_group" "nlb_security_group" {
  name        = "${local.nlb_name}-sg"
  description = "Security group for the NLB on ${terraform.workspace}"
  vpc_id      = var.vpc_id

  # allow all traffic from everywhere
  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # allow all traffic to everywhere
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.tags
}
