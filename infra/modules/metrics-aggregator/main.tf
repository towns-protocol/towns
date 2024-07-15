module "global_constants" {
  source = "../global-constants"
}

data "aws_vpc" "vpc" {
  id = var.vpc_id
}

locals {
  service_name = "metrics-aggregator"
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

# Behind the load balancer
module "internal_sg" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "${local.local_name}_internal_sg"
  description = "Security group for the metrics aggregator"
  vpc_id      = var.vpc_id


  #   # Open for security group id (rule or from_port+to_port+protocol+description)
  #   ingress_with_source_security_group_id = [
  #     {
  #       rule                     = "http-80-tcp"
  #       source_security_group_id = var.alb_security_group_id
  #     }
  #   ]

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
          var.river_chain_rpc_url_secret_arn
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
      }
    ]
  })
}


# resource "aws_lb_target_group" "target_group" {
#   name        = "${local.local_name}-tg"
#   protocol    = "HTTP"
#   port        = 80
#   target_type = "ip"
#   vpc_id      = var.vpc_id


#   health_check {
#     path                = "/health"
#     interval            = 15
#     timeout             = 6
#     healthy_threshold   = 2
#     unhealthy_threshold = 2
#   }

#   tags = module.global_constants.tags
# }

# resource "aws_lb_listener_rule" "http_rule" {
#   listener_arn = var.alb_https_listener_arn

#   lifecycle {
#     ignore_changes = [action]
#   }

#   action {
#     type             = "forward"
#     target_group_arn = aws_lb_target_group.target_group.arn
#   }

#   condition {
#     host_header {
#       values = ["${local.local_name}.${module.global_constants.primary_hosted_zone_name}"]
#     }
#   }
# }

resource "aws_ecs_task_definition" "fargate_task_definition" {
  family = "${local.local_name}-fargate"

  network_mode = "awsvpc"

  task_role_arn      = aws_iam_role.ecs_task_execution_role.arn
  execution_role_arn = aws_iam_role.ecs_task_execution_role.arn

  # TODO: observe performance & update
  cpu = 4096

  # TODO: observe performance & update
  memory = 8192

  requires_compatibilities = ["FARGATE"]

  ipc_mode = null

  pid_mode = null

  container_definitions = jsonencode([{
    name  = "metrics-discovery"
    image = "public.ecr.aws/h5v6m2x1/river-metrics-discovery:latest"

    portMappings = [{
      containerPort = 8080
      hostPort      = 8080
      protocol      = "tcp"
    }]

    essential = true
    mountPoints = [
      {
        sourceVolume  = "prometheus-etc"
        containerPath = "/river/packages/metrics-discovery/prometheus/etc"
      }
    ]

    secrets = [
      {
        name      = "RIVER_RPC_URL",
        valueFrom = var.river_chain_rpc_url_secret_arn
      }
    ]

    environment = [
      {
        name  = "ENV",
        value = terraform.workspace
      }
    ]

    healthCheck = {
      "command" : ["CMD-SHELL", "curl -f http://localhost:8080 || exit 1"],
      "interval" : 30,
      "timeout" : 5,
      "retries" : 3,
      "startPeriod" : 10
    }

    dockerLabels = {
      "com.datadoghq.ad.check_names"  = "[\"prometheus\"]",
      "com.datadoghq.ad.init_configs" = "[{}]",
      "com.datadoghq.ad.instances"    = "[{\"prometheus_url\": \"http://localhost:9090/federate?match%5B%5D=%7Bjob%3D%22river-node%22%7D\", \"namespace\": \"river-node\", \"metrics\": [\"river*\"], \"type_overrides\": {\"*\": \"gauge\"}, \"max_returned_metrics\": 999999999999}]"
    }

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.log_group.name
        "awslogs-region"        = "us-east-1"
        "awslogs-stream-prefix" = "metrics-discovery"
      }
    }
    },
    {
      name  = "prometheus"
      image = "prom/prometheus:v2.53.1"

      essential = false
      mountPoints = [
        {
          sourceVolume  = "prometheus-etc"
          containerPath = "/prometheus/etc"
        }
      ]

      dependsOn = [
        {
          containerName = "metrics-discovery"
          condition     = "HEALTHY"
        }
      ]

      portMappings = [{
        containerPort = 9090
        hostPort      = 9090
        protocol      = "tcp"
      }]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.log_group.name
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "prometheus"
        }
      }

      command = [
        "--config.file=/prometheus/etc/prometheus.yml"
      ]
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

      dependsOn = [
        {
          containerName = "prometheus"
          condition     = "START"
        },
        {
          containerName = "metrics-discovery"
          condition     = "HEALTHY"
        }
      ]

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
          value = "false"
        },
        {
          name  = "DD_PROCESS_AGENT_PROCESS_COLLECTION_ENABLED",
          value = "false"
        },
        {
          name  = "DD_APM_ENABLED",
          value = "false"
        },
        {
          name  = "DD_SYSTEM_PROBE_ENABLED",
          value = "false"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.log_group.name
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "dd-agent"
        }
      }
    }
  ])

  volume {
    name = "prometheus-etc"
  }

  ephemeral_storage {
    size_in_gib = 21
  }

  tags = module.global_constants.tags
}

resource "aws_ecs_service" "river-ecs-service" {
  name                               = "${local.local_name}-fargate-service"
  cluster                            = var.ecs_cluster.id
  task_definition                    = aws_ecs_task_definition.fargate_task_definition.arn
  desired_count                      = 1
  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  enable_execute_command = true

  launch_type      = "FARGATE"
  platform_version = "1.4.0"

  # load_balancer {
  #   target_group_arn = aws_lb_target_group.target_group.arn
  #   container_name   = "prometheus"
  #   container_port   = 80
  # }

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

# data "cloudflare_zone" "zone" {
#   name = module.global_constants.primary_hosted_zone_name
# }

# resource "cloudflare_record" "http_dns" {
#   zone_id = data.cloudflare_zone.zone.id
#   name    = local.local_name
#   value   = var.alb_dns_name
#   type    = "CNAME"
#   ttl     = 60
#   lifecycle {
#     ignore_changes = all
#   }
# }
