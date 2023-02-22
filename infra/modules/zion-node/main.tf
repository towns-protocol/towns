module global_constants {
  source = "../global-constants"
}

locals {
  ecs_cluster_name = "${module.global_constants.environment}-${var.zion_node_name}-zion-ecs-cluster"
  subnet_id = var.subnets[0]
}

data "aws_acm_certificate" "primary_hosted_zone_cert" {
  domain = module.global_constants.primary_hosted_zone_name
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
    {
      rule                     = "http-8080-tcp"
      source_security_group_id = module.zion_alb_sg.security_group_id
    }
  ]

  egress_cidr_blocks = ["0.0.0.0/0"] # public internet
  egress_rules = ["all-all"]

}

# Security-group loop back rule to connect to EFS Volume
resource "aws_security_group_rule" "ecs_loopback_rule" {
  type                      = "ingress"
  from_port                 = 0
  to_port                   = 0
  protocol                  = "-1"
  self                      = true
  description               = "Loopback"
  security_group_id         = "${module.zion_internal_sg.security_group_id}"
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
      certificate_arn    = data.aws_acm_certificate.primary_hosted_zone_cert.arn
      action_type        = "forward"
      target_group_index = 1
    },
  ]

  target_groups = [
    {
      name      = "${module.global_constants.environment}-dendrite-tg"
      backend_protocol = "HTTP"
      backend_port     = 8008
      target_type      = "ip"
      deregistration_delay = 30
      # stickiness = {
      #   type = "lb_cookie"
      #   cookie_duration = 86400
      # }
      # health_check = {
      #   path                = "/_matrix/client/versions"
      #   interval            = 30
      #   timeout             = 5
      #   healthy_threshold   = 2
      #   unhealthy_threshold = 2
      # }
    },
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
  subnet_id = local.subnet_id
  ecs_cluster_name = local.ecs_cluster_name

  depends_on = [aws_ecs_cluster.zion-ecs-cluster]
}

module "dendrite_efs" {
  source = "../efs"
  subnet_id = local.subnet_id
  vpc_id = var.vpc_id
  inbound_security_groups = [
    module.zion_internal_sg.security_group_id, 
    var.bastion_host_security_group_id
  ] 
}

module "task_definitions" {
  source      = "../task-definitions"
  dendrite_file_system_id = module.dendrite_efs.file_system_id
}

resource "aws_ecs_service" "zion-dendrite-service" {
  name            = "${module.global_constants.environment}-zion-dendrite-service"
  cluster         = aws_ecs_cluster.zion-ecs-cluster.id
  task_definition = module.task_definitions.dendrite_task_definition_arn
  desired_count   = 1
  deployment_minimum_healthy_percent = 0 
  # TODO: this will create downtime. Is there a better way?
  deployment_maximum_percent = 200
  lifecycle {
    ignore_changes = [task_definition]
  }
}

# resource "aws_ecs_service" "dendrite-fargate-service" {
#   name            = "${module.global_constants.environment}-dendrite-fargate-service"
#   cluster         = aws_ecs_cluster.zion-ecs-cluster.id
#   task_definition = module.task_definitions.dendrite_fargate_task_definition_arn
#   desired_count   = 1
#   deployment_minimum_healthy_percent = 0 
#   deployment_maximum_percent = 200

#   launch_type      = "FARGATE"
#   platform_version = "1.4.0"

#   # load_balancer {
#   #   target_group_arn = module.zion_alb.target_group_arns[0]
#   #   container_name   = "dendrite"
#   #   container_port   = 8008
#   # }

#   lifecycle {
#    ignore_changes = [task_definition, desired_count]
#  }

#   network_configuration {
#     security_groups  = [module.zion_internal_sg.security_group_id]
#     subnets          = [local.subnet_id]
#     assign_public_ip = true
#   }
# }