module "global_constants" {
  source = "../global-constants"
}

data "aws_vpc" "vpc" {
  id = var.vpc_id
}

module "river_alb_sg" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "${module.global_constants.environment}_river_alb_sg"
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

module "river_alb" {
  source  = "terraform-aws-modules/alb/aws"
  version = "6.0.0"

  name               = "${module.global_constants.environment}-river-alb"
  load_balancer_type = "application"

  vpc_id          = var.vpc_id
  subnets         = var.subnets
  security_groups = [module.river_alb_sg.security_group_id]

  http_tcp_listeners = [
    {
      port        = 80
      protocol    = "HTTP"
      action_type = "redirect"
      redirect = {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  ]


  tags = merge(
    module.global_constants.tags,
    {
      Service  = "river-node-load-balancer"
      Instance = "${var.river_node_name}-load-balancer"
    }
  )

  # setting it to 30 minutes because river context keeps getting cancelled
  idle_timeout = 1800
}
