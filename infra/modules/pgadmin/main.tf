terraform {
  required_providers {
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
  service_name   = "pgadmin"
  name           = "pgadmin-${terraform.workspace}"
  container_name = "pgadmin"
  container_port = 80

  pgadmin_tags = merge(
    module.global_constants.tags,
    {
      Service = local.service_name
    }
  )
  global_remote_state = module.global_constants.global_remote_state.outputs
}

data "aws_vpc" "vpc" {
  id = var.vpc_id
}

data "aws_acm_certificate" "primary_hosted_zone_cert" {
  domain = module.global_constants.primary_hosted_zone_name
}

resource "aws_cloudwatch_log_group" "pgadmin_log_group" {
  name = "/ecs/pgadmin/${local.name}"

  tags = local.pgadmin_tags
}

resource "aws_iam_role" "pgadmin_task_execution_role" {
  name                = "${local.name}-ecsTaskExecutionRole"
  managed_policy_arns = ["arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"]
  assume_role_policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Sid" : "",
        "Effect" : "Allow",
        "Principal" : {
          "Service" : "ecs-tasks.amazonaws.com"
        },
        "Action" : "sts:AssumeRole"
      }
    ]
  })

  tags = local.pgadmin_tags
}

resource "aws_iam_role_policy" "pgadmin_google_oauth2_config_secret" {
  name = "${local.name}-pgadmin-google-oauth2"
  role = aws_iam_role.pgadmin_task_execution_role.id

  policy = <<-EOF
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Action": [
          "secretsmanager:GetSecretValue"
        ],
        "Effect": "Allow",
        "Resource": [
          "${local.global_remote_state.pgadmin_google_oauth2_config_secret.arn}"
        ]
      }
    ]
  }
  EOF
}

resource "aws_ecs_task_definition" "pgadmin-fargate" {
  family = "${local.name}-fargate"

  ephemeral_storage {
    size_in_gib = 21
  }

  network_mode = "awsvpc"

  task_role_arn      = aws_iam_role.pgadmin_task_execution_role.arn
  execution_role_arn = aws_iam_role.pgadmin_task_execution_role.arn

  cpu    = 1024
  memory = 2048

  requires_compatibilities = ["FARGATE"]

  ipc_mode = null

  pid_mode = null

  container_definitions = jsonencode([{
    name  = local.container_name
    image = "dpage/pgadmin4:latest"

    essential = true
    portMappings = [{
      containerPort = local.container_port
      hostPort      = 80
      protocol      = "tcp"
    }]

    cpu    = 1024
    memory = 2048
    secrets = [
      {
        name      = "PGADMIN_CONFIG_OAUTH2_CONFIG"
        valueFrom = local.global_remote_state.pgadmin_google_oauth2_config_secret.arn
      }
    ]
    environment = [
      {
        name  = "PGADMIN_DEFAULT_EMAIL",
        value = "user@domain.com"
      },
      {
        name  = "PGADMIN_DEFAULT_PASSWORD",
        value = "SuperSecret"
      },
      {
        name  = "PGADMIN_CONFIG_AUTHENTICATION_SOURCES",
        value = "['oauth2']"
      },
      {
        name  = "PGADMIN_CONFIG_MASTER_PASSWORD_REQUIRED",
        value = "False"
      }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.pgadmin_log_group.name
        "awslogs-region"        = "us-east-1"
        "awslogs-stream-prefix" = local.name
      }
    }
  }])

  tags = local.pgadmin_tags
}

resource "aws_lb_target_group" "pgadmin_tgrp" {
  name        = local.name
  protocol    = "HTTP"
  port        = 80
  target_type = "ip"
  vpc_id      = var.vpc_id


  health_check {
    path                = "/login"
    interval            = 30
    timeout             = 6
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }

  tags = local.pgadmin_tags
}

resource "aws_lb_listener_rule" "pgadmin_rule" {
  listener_arn = var.alb_https_listener_arn

  lifecycle {
    ignore_changes = [action]
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.pgadmin_tgrp.arn
  }

  condition {
    host_header {
      values = ["${local.name}.${module.global_constants.primary_hosted_zone_name}"]
    }
  }
}

module "pgadmin_ecs_sg" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "${local.name}_sg"
  description = "Security group for pgadmin ECS task"
  vpc_id      = var.vpc_id
}

resource "aws_vpc_security_group_ingress_rule" "allow_alb_into_pgadmin" {
  description = "Allow alb inbound to pgadmin"

  from_port   = 80
  to_port     = 80
  ip_protocol = "tcp"

  security_group_id            = module.pgadmin_ecs_sg.security_group_id
  referenced_security_group_id = var.alb_security_group_id
}

resource "aws_vpc_security_group_egress_rule" "allow_pgadmin_outbound_to_all" {
  description = "Allow pgadmin outbound to all"

  from_port   = 0
  to_port     = 65535
  ip_protocol = "tcp"

  security_group_id = module.pgadmin_ecs_sg.security_group_id

  cidr_ipv4 = "0.0.0.0/0"
}

resource "aws_ecs_service" "pgadmin-ecs-service" {
  name                               = "${local.name}-service"
  cluster                            = var.ecs_cluster.id
  task_definition                    = aws_ecs_task_definition.pgadmin-fargate.arn
  desired_count                      = 1
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100

  launch_type      = "FARGATE"
  platform_version = "1.4.0"

  lifecycle {
    ignore_changes = [task_definition, desired_count, load_balancer]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.pgadmin_tgrp.arn
    container_name   = local.container_name
    container_port   = local.container_port
  }

  network_configuration {
    security_groups  = [module.pgadmin_ecs_sg.security_group_id]
    subnets          = var.private_subnets
    assign_public_ip = false
  }

  timeouts {
    create = "60m"
    delete = "60m"
  }
  tags = local.pgadmin_tags
}

data "cloudflare_zone" "zone" {
  name = module.global_constants.primary_hosted_zone_name
}

resource "cloudflare_record" "pgadmin_dns" {
  zone_id = data.cloudflare_zone.zone.id
  name    = local.name
  value   = var.alb_dns_name
  type    = "CNAME"
  ttl     = 60
}
