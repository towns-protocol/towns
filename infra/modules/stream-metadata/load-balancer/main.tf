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

  tags = local.tags
}

data "aws_ec2_managed_prefix_list" "cloudfront_prefix_list" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

resource "aws_vpc_security_group_ingress_rule" "allow_https_ingress" {
  security_group_id = module.alb_sg.security_group_id

  description = "Allow tcp traffic from CloudFront"

  // only accept incoming traffic from cloudfront ip ranges
  prefix_list_id = data.aws_ec2_managed_prefix_list.cloudfront_prefix_list.id

  ip_protocol = "tcp"

  from_port = 80
  to_port   = 80
}

resource "aws_vpc_security_group_egress_rule" "allow_all_egress" {
  security_group_id = module.alb_sg.security_group_id

  cidr_ipv4   = data.aws_vpc.vpc.cidr_block
  ip_protocol = "-1"
  from_port   = -1
  to_port     = -1
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

resource "aws_lb_listener" "http_listener" {
  load_balancer_arn = module.alb.lb_arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = var.default_target_group_arn
  }
}

output "security_group_id" {
  value = module.alb_sg.security_group_id
}

output "dns_name" {
  value = module.alb.lb_dns_name
}
