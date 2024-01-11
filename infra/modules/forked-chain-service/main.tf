# TODO: check if this component can support websocket connections.

module "global_constants" {
  source = "../global-constants"
}

data "aws_vpc" "vpc" {
  id = var.vpc_id
}

locals {
  service_name        = "${var.chain_name}-fork"
  name                = "${local.service_name}-${terraform.workspace}"
  global_remote_state = module.global_constants.global_remote_state.outputs
  nodes               = module.global_constants.nodes_metadata
}

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.13.1"
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

  tags = module.global_constants.tags
}


# Behind the load balancer
module "internal_sg" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "${local.name}_internal_sg"
  description = "Security group for forked chain service: ${local.name}"
  vpc_id      = var.vpc_id


  # Open for security group id (rule or from_port+to_port+protocol+description)
  ingress_with_source_security_group_id = [
    {
      rule                     = "http-80-tcp"
      source_security_group_id = var.alb_security_group_id
    },
    {
      protocol                 = "tcp"
      from_port                = 8545
      to_port                  = 8545
      source_security_group_id = var.alb_security_group_id
    },
  ]

  egress_cidr_blocks = ["0.0.0.0/0"] # public internet
  egress_rules       = ["all-all"]
}

resource "aws_cloudwatch_log_group" "log_group" {
  name = "/ecs/${local.name}"

  tags = merge(
    module.global_constants.tags,
    {
      "Service" = local.service_name
    }
  )
}

resource "aws_cloudwatch_log_subscription_filter" "log_group_filter" {
  name            = "${local.name}-log-group"
  log_group_name  = aws_cloudwatch_log_group.log_group.name
  filter_pattern  = ""
  destination_arn = module.global_constants.datadug_forwarder_stack_lambda.arn
}

resource "aws_iam_role_policy" "ecs_task_execution_role_policy" {
  name = local.name
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
          "${var.fork_url_secret_arn}"
        ]
      }
    ]
  }
  EOF
}

resource "aws_lb_target_group" "main" {
  name        = "${local.name}-tg"
  protocol    = "HTTP"
  port        = 80
  target_type = "ip"
  vpc_id      = var.vpc_id

  tags = module.global_constants.tags

  health_check {
    path                = "/"
    interval            = 30
    timeout             = 6
    healthy_threshold   = 2
    unhealthy_threshold = 2

    # anvil doesn't have a health check endpoint, so we're just going to
    # check the status code of the root path.
    matcher = 400
  }
}

resource "aws_lb_listener_rule" "host_rule" {
  listener_arn = var.alb_https_listener_arn

  lifecycle {
    ignore_changes = [action]
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }

  condition {
    host_header {
      values = ["${local.name}.${module.global_constants.primary_hosted_zone_name}"]
    }
  }
}

resource "aws_ecs_task_definition" "task_definition" {
  family = "${local.name}-fargate"

  network_mode = "awsvpc"

  task_role_arn      = aws_iam_role.ecs_task_execution_role.arn
  execution_role_arn = aws_iam_role.ecs_task_execution_role.arn

  requires_compatibilities = ["FARGATE"]

  ipc_mode = null

  pid_mode = null

  cpu    = 1024
  memory = 2048

  container_definitions = jsonencode([{
    name  = "anvil"
    image = "${local.global_remote_state.public_ecr.repository_url_map["forked-chain-service"]}:latest"

    essential = true
    portMappings = [{
      containerPort = 8545
      hostPort      = 8545
      protocol      = "tcp"
    }]

    secrets = [
      {
        name      = "FORK_URL",
        valueFrom = var.fork_url_secret_arn
      }
    ]

    environment = [
      {
        name  = "CHAIN_ID",
        value = tostring(var.chain_id)
      },
      {
        name  = "FORK_BLOCK_NUMBER",
        value = tostring(var.fork_block_number)
      },
      {
        name  = "BLOCK_TIME",
        value = tostring(var.block_time)
      },
      {
        name  = "PORT",
        value = "8545"
      },
      {
        name  = "FUNDING_WALLETS_CSV",
        value = <<-EOF
        ${local.nodes[0].address},
        ${local.nodes[1].address},
        ${local.nodes[2].address},
        ${local.nodes[3].address},
        ${local.nodes[4].address},
        ${local.nodes[5].address},
        ${local.nodes[6].address},
        ${local.nodes[7].address},
        ${local.nodes[8].address},
        ${local.nodes[9].address}
        EOF
      }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.log_group.name
        "awslogs-region"        = "us-east-1"
        "awslogs-stream-prefix" = local.name
      }
    }
  }])

  tags = module.global_constants.tags
}

resource "aws_ecs_service" "ecs-service" {
  name                               = "${local.name}-fargate-service"
  cluster                            = var.ecs_cluster.id
  task_definition                    = aws_ecs_task_definition.task_definition.arn
  desired_count                      = 1
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100

  launch_type      = "FARGATE"
  platform_version = "1.4.0"

  load_balancer {
    target_group_arn = aws_lb_target_group.main.arn
    container_name   = "anvil"
    container_port   = 8545
  }

  network_configuration {
    security_groups  = [module.internal_sg.security_group_id]
    subnets          = var.service_subnets
    assign_public_ip = true
  }

  timeouts {
    create = "60m"
    delete = "60m"
  }

  tags = merge(
    module.global_constants.tags,
    {
      "Service" = local.service_name
    }
  )
}

data "cloudflare_zone" "zone" {
  name = module.global_constants.primary_hosted_zone_name
}

resource "cloudflare_record" "alb_dns" {
  zone_id = data.cloudflare_zone.zone.id
  name    = local.name
  value   = var.alb_dns_name
  type    = "CNAME"
  ttl     = 60
  lifecycle {
    ignore_changes = all
  }
}
