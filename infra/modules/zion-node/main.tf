module global_constants {
  source = "../global-constants"
}

locals {
  ecs_cluster_name = "${module.global_constants.environment}-${var.zion_node_name}-zion-ecs-cluster"
}

data "aws_route53_zone" "primary_hosted_zone" {
  name = module.global_constants.hosted_zone_name
}

# TODO: want to make this a multi domain certificate. then we can pull it out and pass it in
module "acm" {
  source = "terraform-aws-modules/acm/aws"
  version = "~> 4.0"

  domain_name = var.zion_node_dns_name
  zone_id = data.aws_route53_zone.primary_hosted_zone.id

  subject_alternative_names = [] 

  wait_for_validation = true

  tags = merge(module.global_constants.tags, {Name = var.zion_node_dns_name})
}

module "zion_alb_sg" {
  source = "terraform-aws-modules/security-group/aws"

  # TODO: eventually add node name into the alb name - or consider having a single alb that routes
  # based on node name

  name        = "${module.global_constants.environment}_zion_alb_sg"
  description = "Security group zion load balancer"
  vpc_id      = var.vpc_id

  ingress_cidr_blocks = ["0.0.0.0/0"] # public internet
  ingress_rules = ["https-443-tcp", "http-80-tcp"]


  computed_egress_with_cidr_blocks = [
    {
      rule        = "all-all"
      cidr_blocks = var.vpc_cidr_block
       # The load balancer will only be allowed to speak to other resources in the VPC
    },
  ]

  number_of_computed_egress_with_cidr_blocks = 1
}

# Behind the load balancer
module "zion_internal_sg" { 
  source = "terraform-aws-modules/security-group/aws"

  name        = "${module.global_constants.environment}_zion_internal_sg"
  description = "Security group for zion ec2 servers"
  vpc_id      = var.vpc_id


  # Open for security group id (rule or from_port+to_port+protocol+description)
  ingress_with_source_security_group_id = [
    {
      rule                     = "http-80-tcp"
      source_security_group_id = module.zion_alb_sg.security_group_id
    },
  ]

  egress_cidr_blocks = ["0.0.0.0/0"] # public internet
  egress_rules = ["all-all"]

}

resource "aws_route53_record" "zion_node_dns_record" {
  zone_id = data.aws_route53_zone.primary_hosted_zone.zone_id
  type = "CNAME"
  ttl = 30 # TODO: revert to 600 after stabilized
  records = [ module.zion_alb.lb_dns_name ]
  name = var.zion_node_dns_name
}

module "task_definitions" {
  source      = "../task-definitions"
}

module "zion_alb" {
  source = "terraform-aws-modules/alb/aws"
  version = "6.0.0"

  name = "${module.global_constants.environment}-zion-alb"
  load_balancer_type = "application"

  vpc_id = var.vpc_id
  subnets = var.subnets
  security_groups = [module.zion_alb_sg.security_group_id]

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
  ]

  https_listeners = [
    {
      port               = 443
      protocol           = "HTTPS"
      certificate_arn    = module.acm.acm_certificate_arn
      action_type        = "forward"
      target_group_index = 0
    },
  ]

  target_groups = [
    {
      name_prefix      = "zion-"
      backend_protocol = "HTTP"
      backend_port     = 80
      target_type      = "instance"
      targets = {
        my_target = {
          target_id = module.docker_ec2_host.ec2_instance_id
          port = 80
        }
      }
      # TODO: handle health checks
    },
  ]

  tags = module.global_constants.tags
}

resource "aws_ecs_cluster" "zion-ecs-cluster" {
  name = local.ecs_cluster_name
}

module "docker_ec2_host" {
  source = "../ec2"
  security_group_id = module.zion_internal_sg.security_group_id
  subnet_id = var.subnets[0]
  ecs_cluster_name = local.ecs_cluster_name

  depends_on = [aws_ecs_cluster.zion-ecs-cluster]
}

resource "aws_ecs_service" "zion-postgres-service" {
  name            = "${module.global_constants.environment}-zion-postgres-service"
  cluster         = aws_ecs_cluster.zion-ecs-cluster.id
  task_definition = module.task_definitions.postgres_task_definition_arn
  desired_count   = 1
}

resource "aws_ecs_service" "zion-dendrite-service" {
  name            = "${module.global_constants.environment}-zion-dendrite-service"
  cluster         = aws_ecs_cluster.zion-ecs-cluster.id
  task_definition = module.task_definitions.dendrite_task_definition_arn
  desired_count   = 1
  deployment_minimum_healthy_percent = 0 
  # TODO: this will create downtime. Is there a better way?
  deployment_maximum_percent = 200
}