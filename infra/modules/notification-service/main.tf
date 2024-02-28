module "global_constants" {
  source = "../global-constants"
}

data "aws_vpc" "vpc" {
  id = var.vpc_id
}

// https://notifications-gamma.towns.com
// https://notifications-transient-1234.towns.com
locals {
  service_name = "notification-service"
  local_name   = "notifications-${terraform.workspace}"

  global_remote_state = module.global_constants.global_remote_state.outputs

  server_tags = merge(
    module.global_constants.tags,
    {
      Service = local.service_name
    }
  )
}

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

data "terraform_remote_state" "global_remote_state" {
  backend = "s3"

  config = {
    region  = "us-east-1"
    profile = "harmony-github-actions"
    bucket  = "here-not-there-terraform-state"
    key     = "env:/global/default"
  }
}

resource "aws_iam_role" "ecs_task_execution_role" {
  name                = "${local.local_name}-ecsTaskExecutionRole"
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

  tags = module.global_constants.tags
}

# Behind the load balancer
module "internal_sg" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "${local.local_name}_internal_sg"
  description = "Security group for the notification service"
  vpc_id      = var.vpc_id


  # Open for security group id (rule or from_port+to_port+protocol+description)
  ingress_with_source_security_group_id = [
    {
      rule                     = "http-80-tcp"
      source_security_group_id = var.alb_security_group_id
    }
  ]

  egress_cidr_blocks = ["0.0.0.0/0"] # public internet
  egress_rules       = ["all-all"]
}

resource "aws_security_group_rule" "allow_inbound_to_db" {
  type      = "ingress"
  from_port = 5432
  to_port   = 5432
  protocol  = "tcp"

  security_group_id        = var.river_node_db.rds_aurora_postgresql.security_group_id
  source_security_group_id = module.internal_sg.security_group_id
}

resource "aws_cloudwatch_log_group" "log_group" {
  name = "/ecs/notification-service/${local.local_name}"

  tags = local.server_tags
}

resource "aws_cloudwatch_log_subscription_filter" "log_group_filter" {
  name            = "${local.local_name}-log-group"
  log_group_name  = aws_cloudwatch_log_group.log_group.name
  filter_pattern  = ""
  destination_arn = module.global_constants.datadug_forwarder_stack_lambda.arn
}

resource "aws_iam_role_policy" "iam_policy" {
  name = "${local.local_name}-iam-policy"
  role = aws_iam_role.ecs_task_execution_role.id

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
          "${var.vapid_key_secret_arn}",
          "${local.global_remote_state.river_global_push_notification_auth_token.arn}",
          "${local.global_remote_state.notification_service_db_password_secret.arn}"
        ]
      }
    ]
  }
  EOF
}

resource "aws_lb_target_group" "target_group" {
  name        = "${local.local_name}-tg"
  protocol    = "HTTP"
  port        = 80
  target_type = "ip"
  vpc_id      = var.vpc_id


  health_check {
    # TODO: / build this endpoint
    path                = "/health"
    interval            = 15
    timeout             = 6
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }

  tags = module.global_constants.tags
}

resource "aws_lb_listener_rule" "http_rule" {
  listener_arn = var.alb_https_listener_arn

  lifecycle {
    ignore_changes = [action]
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.target_group.arn
  }

  condition {
    host_header {
      values = ["${local.local_name}.${module.global_constants.primary_hosted_zone_name}"]
    }
  }
}

resource "aws_ecs_task_definition" "fargate_task_definition" {
  family = "${local.local_name}-fargate"

  network_mode = "awsvpc"

  task_role_arn      = aws_iam_role.ecs_task_execution_role.arn
  execution_role_arn = aws_iam_role.ecs_task_execution_role.arn

  # 4 vCPU
  # TODO: observe performance & update
  cpu = 4096

  # 30 GB
  # TODO: observe performance & update
  memory = 30720

  requires_compatibilities = ["FARGATE"]

  ipc_mode = null

  pid_mode = null

  container_definitions = jsonencode([{
    name  = "notification-service"
    image = "${local.global_remote_state.public_ecr.repository_url_map["notification-service"]}:latest"

    essential = true
    portMappings = [{
      containerPort = 80
      hostPort      = 80
      protocol      = "tcp"
    }]

    secrets = [
      {
        name      = "AUTH_SECRET",
        valueFrom = local.global_remote_state.river_global_push_notification_auth_token.arn
      },
      {
        name      = "DB_PASSWORD",
        valueFrom = local.global_remote_state.notification_service_db_password_secret.arn
      },
      {
        name      = "VAPID_PUBLIC_KEY",
        valueFrom = "${var.vapid_key_secret_arn}:publicKey::"
      },
      {
        name      = "VAPID_PRIVATE_KEY",
        valueFrom = "${var.vapid_key_secret_arn}:privateKey::"
      }
    ]

    environment = [
      {
        name  = "DB_USER",
        value = "notification_service"
      },
      {
        name  = "DB_HOST",
        value = var.river_node_db.rds_aurora_postgresql.cluster_endpoint
      },
      {
        name  = "DB_DATABASE",
        value = "river"
      },
      {
        name  = "DB_PORT",
        value = "5432"
      },
      {
        name  = "VAPID_SUBJECT",
        value = var.vapid_subject
      }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.log_group.name
        "awslogs-region"        = "us-east-1"
        "awslogs-stream-prefix" = local.local_name
      }
    }
    }
  ])

  tags = module.global_constants.tags
}

resource "aws_ecs_service" "river-ecs-service" {
  name                               = "${local.local_name}-fargate-service"
  cluster                            = var.ecs_cluster.id
  task_definition                    = aws_ecs_task_definition.fargate_task_definition.arn
  desired_count                      = 1
  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  # do not attempt to create the service before the lambda runs
  depends_on = [var.river_node_db]

  enable_execute_command = true

  launch_type      = "FARGATE"
  platform_version = "1.4.0"

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.target_group.arn
    container_name   = "notification-service"
    container_port   = 80
  }

  network_configuration {
    security_groups  = [module.internal_sg.security_group_id]
    subnets          = var.subnets
    assign_public_ip = false
  }

  timeouts {
    create = "60m"
    delete = "60m"
  }

  tags = local.server_tags
}

data "cloudflare_zone" "zone" {
  name = module.global_constants.primary_hosted_zone_name
}

resource "cloudflare_record" "http_dns" {
  zone_id = data.cloudflare_zone.zone.id
  name    = local.local_name
  value   = var.alb_dns_name
  type    = "CNAME"
  ttl     = 60
  lifecycle {
    ignore_changes = all
  }
}
