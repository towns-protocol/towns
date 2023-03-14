module global_constants {
  source = "../global-constants"
}

data "aws_acm_certificate" "primary_hosted_zone_cert" {
  domain = module.global_constants.primary_hosted_zone_name
}

data "aws_vpc" "vpc" {
  id = var.vpc_id
}

module "dendrite_node_db" {
  source = "../../modules/node-db"

  database_subnets = var.database_subnets
  allowed_cidr_blocks = var.database_allowed_cidr_blocks
  vpc_id = var.vpc_id
  dendrite_node_name = var.dendrite_node_name
}

# Behind the load balancer
module "dendrite_internal_sg" { 
  source = "terraform-aws-modules/security-group/aws"

  name        = "${module.global_constants.environment}_dendrite_internal_sg"
  description = "Security group for dendrite nodes"
  vpc_id      = var.vpc_id


  # Open for security group id (rule or from_port+to_port+protocol+description)
  ingress_with_source_security_group_id = [
    {
      rule                     = "http-80-tcp"
      source_security_group_id = var.dendrite_alb_security_group_id
    },
    {
      protocol    = "tcp"
      from_port   = 8008
      to_port     = 8008
      source_security_group_id = var.dendrite_alb_security_group_id
    },
    {
      protocol    = "tcp"
      from_port   = 65432
      to_port     = 65432
      source_security_group_id = var.dendrite_alb_security_group_id
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
  security_group_id         = "${module.dendrite_internal_sg.security_group_id}"
}

module "dendrite_efs" {
  source = "../efs"
  subnets = var.dendrite_node_subnets
  vpc_id = var.vpc_id
  inbound_security_groups = [
    module.dendrite_internal_sg.security_group_id, 
    var.bastion_host_security_group_id
  ] 
}

module "task_definitions" {
  source      = "../task-definitions"
  dendrite_file_system_id = module.dendrite_efs.file_system_id
  dendrite_node_name = var.dendrite_node_name
  dendrite_log_group_name = var.dendrite_log_group_name
}

resource "aws_ecs_service" "dendrite-ecs-service" {
  name            = "${module.global_constants.environment}-dendrite-${var.dendrite_node_name}-fargate-service"
  cluster         = var.ecs_cluster_id
  task_definition = module.task_definitions.dendrite_fargate_task_definition_arn
  desired_count   = 1
  deployment_minimum_healthy_percent = 0 
  deployment_maximum_percent = 200

  launch_type      = "FARGATE"
  platform_version = "LATEST"

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  load_balancer {
    target_group_arn = var.dendrite_server_target_group_arn
    container_name   = "dendrite"
    container_port   = 8008
  }

  load_balancer {
    target_group_arn = var.dendrite_profiler_target_group_arn
    container_name   = "dendrite"
    container_port   = 65432
  }

  network_configuration {
    security_groups  = [module.dendrite_internal_sg.security_group_id]
    subnets          = var.dendrite_node_subnets
    assign_public_ip = true
  }
}