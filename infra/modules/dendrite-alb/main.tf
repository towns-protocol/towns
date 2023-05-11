module global_constants {
  source = "../global-constants"
}

data "aws_acm_certificate" "primary_hosted_zone_cert" {
  domain = module.global_constants.primary_hosted_zone_name
}

data "aws_vpc" "vpc" {
  id = var.vpc_id
}

locals {
  pgadmin_domain_name = "${var.pgadmin_subdomain}.towns.com"
}

module "dendrite_alb_sg" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "${module.global_constants.environment}_dendrite_alb_sg"
  description = "Security group dendrite load balancer"
  vpc_id      = var.vpc_id

  ingress_cidr_blocks = ["0.0.0.0/0"] # public internet
  ingress_rules = [
    "https-443-tcp", 
    "http-80-tcp", 
  ]

  ingress_with_cidr_blocks = [
    {
      protocol    = "tcp"
      from_port   = 65432
      to_port     = 65432
      description = "profiler"
    },
    {
      protocol    = "tcp"
      from_port   = 5433
      to_port     = 5433
      description = "pgadmin"
      cidr_blocks = "0.0.0.0/32" # replace with the ip of admin user
    }
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

module "dendrite_alb" {
  source = "terraform-aws-modules/alb/aws"
  version = "6.0.0"

  name = "${module.global_constants.environment}-dendrite-alb"
  load_balancer_type = "application"

  vpc_id = var.vpc_id
  subnets = var.subnets
  security_groups = [module.dendrite_alb_sg.security_group_id]

  http_tcp_listeners = [
    {
      port               = 80
      protocol           = "HTTP"
      action_type        = "redirect"
      redirect = {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    },
    {
      port              = 65432
      protocol          = "HTTP"
      action_type       = "forward"
      target_group_index = 2
    }
  ]

  https_listeners = [
    {
      # default rule is rejection, so we can add more rules later, such as subdomain gating
      port              = 5433
      protocol          = "HTTPS"
      certificate_arn    = data.aws_acm_certificate.primary_hosted_zone_cert.arn
      action_type       = "fixed-response"
      fixed_response = {
        content_type = "text/plain"
        message_body = "Forbidden"
        status_code  = "403"
      }
    },
    {
      port               = 443
      protocol           = "HTTPS"
      certificate_arn    = data.aws_acm_certificate.primary_hosted_zone_cert.arn
      action_type       = "forward"
      target_group_index = 0
    },

  ]

  https_listener_rules = [
      # if the host header is the pgadmin domain name, forward to the pgadmin target group
      # otherwise reject
    {
      https_listener_index = 0
      priority             = 1
      actions = [{
        type        = "forward"
        target_group_index = 3
      }]
      conditions = [{
        host_headers = [local.pgadmin_domain_name]
        # host_headers = ["*.com"]
      }]
    }
  ]

  target_groups = [
    {
      name      = "${module.global_constants.environment}-dendrite-server-blue"
      backend_protocol = "HTTP"
      backend_port     = 80
      target_type      = "ip"
      deregistration_delay = 30
      health_check = {
        path                = "/_matrix/client/versions"
        interval            = 30
        timeout             = 6
        healthy_threshold   = 2
        unhealthy_threshold = 2
      }
    },
    {
      name      = "${module.global_constants.environment}-dendrite-server-green"
      backend_protocol = "HTTP"
      backend_port     = 80
      target_type      = "ip"
      deregistration_delay = 30
      health_check = {
        path                = "/_matrix/client/versions"
        interval            = 30
        timeout             = 6
        healthy_threshold   = 2
        unhealthy_threshold = 2
      }
    },
    {
      name      = "${module.global_constants.environment}-dendrite-profiler"
      backend_protocol = "HTTP"
      backend_port     = 65432
      target_type      = "ip"
      deregistration_delay = 30

      health_check = {
        path                = "/"
        interval            = 30
        timeout             = 6
        healthy_threshold   = 2
        unhealthy_threshold = 2
        matcher = "200-499"
      }
    },
    {
      name      = "${module.global_constants.environment}-dendrite-pgadmin"
      backend_protocol = "HTTP"
      backend_port     = 80
      target_type      = "ip"
      deregistration_delay = 30

      health_check = {
        path                = "/"
        interval            = 30
        timeout             = 6
        healthy_threshold   = 2
        unhealthy_threshold = 2
        matcher = "200-499"
      }
    }
  ]

  tags = module.global_constants.tags

  # setting it to 30 minutes because dendrite context keeps getting cancelled
  idle_timeout = 1800
}

