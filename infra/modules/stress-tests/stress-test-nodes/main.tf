
locals {
  service_name        = "stress-test-node"
  name                = "${local.service_name}-${terraform.workspace}-${var.container_index}"
  global_remote_state = module.global_constants.global_remote_state.outputs

  custom_tags = merge(
    var.tags,
    {
      Service         = local.service_name,
      Container_Index = var.container_index
    }
  )
}

module "global_constants" {
  source = "../../global-constants"
}

data "aws_vpc" "vpc" {
  id = var.vpc_id
}

resource "aws_cloudwatch_log_group" "log_group" {
  name = "/ecs/${local.name}"
  tags = local.custom_tags
}

resource "aws_cloudwatch_log_subscription_filter" "log_group_filter" {
  name            = "${local.name}-log-group"
  log_group_name  = aws_cloudwatch_log_group.log_group.name
  filter_pattern  = ""
  destination_arn = module.global_constants.datadug_forwarder_stack_lambda.arn
}

resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${local.name}-ecsTaskExecutionRole"
  managed_policy_arns = ["arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    var.system_parameters.river_system_parameters_policy.arn
  ]
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

  tags = local.custom_tags
}

resource "aws_iam_role_policy" "secrets" {
  name = "${local.name}-secrets"
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
          "${var.base_chain_rpc_url_secret_arn}",
          "${var.river_chain_rpc_url_secret_arn}",
          "${var.stress_test_wallet_mnemonic_secret_arn}"
        ]
      }
    ]
  }
  EOF
}

resource "aws_ecs_task_definition" "task_definition" {
  family = "${local.name}-fargate"

  ephemeral_storage {
    size_in_gib = 21
  }

  network_mode = "awsvpc"

  task_role_arn      = aws_iam_role.ecs_task_execution_role.arn
  execution_role_arn = aws_iam_role.ecs_task_execution_role.arn

  cpu    = 8192
  memory = 16384

  requires_compatibilities = ["FARGATE"]

  ipc_mode = null

  pid_mode = null

  container_definitions = jsonencode([{
    name  = local.service_name
    image = "public.ecr.aws/h5v6m2x1/river-stress-test-node:latest"

    essential = true
    portMappings = [{
      containerPort = 80
      hostPort      = 80
      protocol      = "tcp"
    }]

    cpu    = 2048
    memory = 4096

    secrets = [
      {
        name      = "BASE_CHAIN_RPC_URL"
        valueFrom = var.base_chain_rpc_url_secret_arn
      },
      {
        name      = "RIVER_CHAIN_RPC_URL"
        valueFrom = var.river_chain_rpc_url_secret_arn
      },
      {
        name      = "MNEMONIC",
        valueFrom = var.stress_test_wallet_mnemonic_secret_arn
      },
      {
        name      = "SESSION_ID",
        valueFrom = var.system_parameters.stress_test_session_id_parameter.arn
      },
      {
        name      = "CLIENTS_COUNT",
        valueFrom = var.system_parameters.stress_test_clients_count_parameter.arn
      },
      {
        name      = "CONTAINER_COUNT",
        valueFrom = var.system_parameters.stress_test_container_count_parameter.arn
      },
      {
        name      = "PROCESSES_PER_CONTAINER",
        valueFrom = var.system_parameters.stress_test_processes_per_container_parameter.arn
      },
      {
        name      = "STRESS_DURATION",
        valueFrom = var.system_parameters.stress_test_stress_duration_parameter.arn
      }
    ]

    environment = [
      {
        name  = "STRESS_MODE",
        value = "chat"
      },
      {
        name  = "RIVER_ENV",
        value = terraform.workspace
      },
      {
        # TODO: make this a variable so we can reuse this module for other environments
        name  = "SPACE_ID",
        value = "10a38bcf15ab6b94d404c201dee9f67c6428c0ecb10000000000000000000000"
      },
      {
        # TODO: make this a variable so we can reuse this module for other environments
        name  = "ANNOUNCE_CHANNEL_ID",
        value = "20a38bcf15ab6b94d404c201dee9f67c6428c0ecb1a166f49d6787eb5dd4e1b1"
      },
      {
        # TODO: make this a variable so we can reuse this module for other environments
        name  = "CHANNEL_IDS",
        value = "20a38bcf15ab6b94d404c201dee9f67c6428c0ecb14c8601d7f529814cebe12c,20a38bcf15ab6b94d404c201dee9f67c6428c0ecb1826ef52f48e2e904844cff"
      },
      {
        name  = "CONTAINER_INDEX",
        value = tostring(var.container_index)
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

  tags = local.custom_tags
}

resource "aws_ecs_service" "stress_test_ecs_service" {
  name                               = "${local.name}-service"
  cluster                            = var.ecs_cluster.id
  task_definition                    = aws_ecs_task_definition.task_definition.arn
  desired_count                      = 0
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100

  launch_type      = "FARGATE"
  platform_version = "1.4.0"

  lifecycle {
    ignore_changes = [desired_count]
  }

  network_configuration {
    security_groups  = [var.security_group_id]
    subnets          = var.subnets
    assign_public_ip = false
  }

  timeouts {
    create = "60m"
    delete = "60m"
  }
  tags = local.custom_tags
}
