module "global_constants" {
  source = "../global-constants"
}

data "aws_vpc" "vpc" {
  id = var.vpc_id
}

locals {
  service_name = "stream-metadata"
  local_name   = "${local.service_name}-${terraform.workspace}"

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

resource "aws_lb_target_group" "target_group" {
  name        = "${local.local_name}-tg"
  protocol    = "HTTP"
  port        = local.service_port
  target_type = "ip"
  vpc_id      = var.vpc_id


  health_check {
    path                = "/health"
    interval            = 60
    timeout             = 6
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }

  tags = module.global_constants.tags
}

module "alb" {
  source  = "./load-balancer"
  vpc_id  = var.vpc_id
  subnets = var.public_subnets

  default_target_group_arn = aws_lb_target_group.target_group.arn
}

module "cdn" {
  source             = "./cdn"
  alias_domain_name  = local.host
  origin_domain_name = module.alb.dns_name
}

# Behind the load balancer
module "internal_sg" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "${local.local_name}_internal_sg"
  description = "Security group for the stream metadata service"
  vpc_id      = var.vpc_id


  # Open for security group id (rule or from_port+to_port+protocol+description)
  ingress_with_source_security_group_id = [
    {
      rule                     = "http-80-tcp"
      source_security_group_id = module.alb.security_group_id
    }
  ]

  egress_cidr_blocks = ["0.0.0.0/0"] # public internet
  egress_rules       = ["all-all"]
}

resource "aws_cloudwatch_log_group" "log_group" {
  name = "/ecs/${local.local_name}"

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

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "secretsmanager:GetSecretValue",
        ],
        Resource = [
          local.global_remote_state.river_global_dd_agent_api_key.arn,
          var.river_chain_rpc_url_secret_arn,
          var.base_chain_rpc_url_secret_arn
        ]
      },
      {
        Effect = "Allow",
        Action = [
          "ec2:DescribeNetworkInterfaces"
        ],
        Resource = "*"
      },
      {
        Effect = "Allow",
        Action = [
          "ecs:DescribeTasks"
        ],
        Resource = "*"
      },
      {
        Effect = "Allow",
        Action = [
          "ssmmessages:CreateControlChannel",
          "ssmmessages:CreateDataChannel",
          "ssmmessages:OpenControlChannel",
          "ssmmessages:OpenDataChannel"
        ],
        Resource = "*"
      },
      {
        Effect = "Allow",
        Action = [
          "cloudfront:CreateInvalidation",
        ],
        Resource = module.cdn.arn
      },
      {
        Effect = "Allow",
        Action = [
          "cloudfront:GetDistribution",
          "cloudfront:ListDistributions"
        ],
        Resource = "*"
      }
    ]
  })
}

locals {
  service_port = 80
}

locals {
  subdomain        = terraform.workspace == "omega" ? "@" : terraform.workspace
  hosted_zone_name = module.global_constants.river_delivery_hosted_zone_name
  host             = local.subdomain == "@" ? local.hosted_zone_name : "${local.subdomain}.${local.hosted_zone_name}"
  base_url         = "https://${local.host}"
}

resource "aws_ecs_task_definition" "fargate_task_definition" {
  family = "${local.local_name}-fargate"

  network_mode = "awsvpc"

  task_role_arn      = aws_iam_role.ecs_task_execution_role.arn
  execution_role_arn = aws_iam_role.ecs_task_execution_role.arn

  # TODO: observe performance & update
  cpu = 2048

  # TODO: observe performance & update
  memory = 4096

  requires_compatibilities = ["FARGATE"]

  ipc_mode = null

  pid_mode = null

  container_definitions = jsonencode([{
    name  = local.service_name
    image = "public.ecr.aws/h5v6m2x1/river-stream-metadata:latest"

    portMappings = [{
      containerPort = local.service_port
      hostPort      = local.service_port
      protocol      = "tcp"
    }]

    essential = true

    secrets = [
      {
        name      = "RIVER_CHAIN_RPC_URL",
        valueFrom = var.river_chain_rpc_url_secret_arn
      },
      {
        name      = "BASE_CHAIN_RPC_URL",
        valueFrom = var.base_chain_rpc_url_secret_arn
      }
    ]

    environment = [
      {
        name  = "RIVER_ENV",
        value = terraform.workspace
      },
      {
        name  = "PORT",
        value = tostring(local.service_port)
      },
      {
        name  = "HOST",
        value = "0.0.0.0"
      },
      {
        name  = "LOG_LEVEL",
        value = "info"
      },
      {
        name  = "LOG_PRETTY",
        value = "false"
      },
      {
        name  = "RIVER_STREAM_METADATA_BASE_URL",
        value = local.base_url
      },
      {
        name  = "CLOUDFRONT_DISTRIBUTION_ID",
        value = module.cdn.id
      }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.log_group.name
        "awslogs-region"        = "us-east-1"
        "awslogs-stream-prefix" = local.service_name
      }
    }
    },
    {
      name  = "dd-agent"
      image = "public.ecr.aws/datadog/agent:7"

      essential = true
      portMappings = [{
        "containerPort" : 8126,
        "hostPort" : 8126,
        "protocol" : "tcp"
      }]

      cpu    = 1024
      memory = 2048

      secrets = [{
        name      = "DD_API_KEY"
        valueFrom = local.global_remote_state.river_global_dd_agent_api_key.arn
      }]

      environment = [
        {
          name  = "DD_SITE",
          value = "datadoghq.com"
        },
        {
          name  = "ECS_FARGATE",
          value = "true"
        },
        {
          name  = "DD_APM_ENABLED",
          value = "true"
        },
        {
          name  = "DD_PROFILING_ENABLED",
          value = "true"
        }
      ]
    }
  ])

  tags = module.global_constants.tags
}

resource "aws_ecs_service" "ecs-service" {
  name                               = "${local.local_name}-fargate-service"
  cluster                            = var.ecs_cluster.id
  task_definition                    = aws_ecs_task_definition.fargate_task_definition.arn
  desired_count                      = 1
  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  enable_execute_command = true

  launch_type      = "FARGATE"
  platform_version = "1.4.0"

  load_balancer {
    target_group_arn = aws_lb_target_group.target_group.arn
    container_name   = local.service_name
    container_port   = local.service_port
  }

  network_configuration {
    security_groups  = [module.internal_sg.security_group_id]
    subnets          = var.private_subnets
    assign_public_ip = false
  }

  tags = local.server_tags
}

data "cloudflare_zone" "zone" {
  name = local.hosted_zone_name
}

resource "cloudflare_record" "http_dns" {
  zone_id = data.cloudflare_zone.zone.id
  name    = local.subdomain
  value   = module.cdn.domain_name

  type = "CNAME"
  ttl  = 60
}
