locals {
  container_name      = "loadtest-follower"
  name                = "${local.container_name}-${var.follower_id}-${terraform.workspace}"
  global_remote_state = module.global_constants.global_remote_state.outputs

  custom_tags = merge(
    var.tags,
    {
      Service     = local.container_name,
      Follower_Id = var.follower_id
    }
  )

  base_chain_default_td_secret_config = var.base_chain_rpc_url_override == null ? [{
    name      = "BASE_CHAIN_RPC_URL"
    valueFrom = local.global_remote_state.base_chain_network_url_secret.arn
  }] : []

  base_chain_override_td_env_config = var.base_chain_rpc_url_override == null ? [] : [{
    name  = "BASE_CHAIN_RPC_URL"
    value = var.base_chain_rpc_url_override
  }]
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
          "${local.global_remote_state.base_chain_network_url_secret.arn}"
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
    name  = local.container_name
    image = "public.ecr.aws/h5v6m2x1/river-stress-test-node:latest"

    essential = true
    portMappings = [{
      containerPort = 80
      hostPort      = 80
      protocol      = "tcp"
    }]

    cpu    = 8192
    memory = 16384

    secrets = local.base_chain_default_td_secret_config

    environment = concat([
      {
        name  = "MODE",
        value = "follower"
      },
      {
        name  = "RIVER_NODE_URL",
        value = var.river_node_url
      },
      {
        name  = "CHANNEL_SAMPLING_RATE",
        value = "100"
      },
      {
        name  = "LOAD_TEST_DURATION_MS",
        value = tostring(var.loadtest_duration)
      },
      {
        name  = "MAX_MSG_DELAY_MS",
        value = "10000"
      },
      {
        name  = "JOIN_FACTOR",
        value = "5"
      },
      {
        name  = "NUM_CLIENTS_PER_PROCESS",
        value = tostring(var.num_clients_per_process)
      },
      {
        name  = "REDIS_HOST",
        value = var.redis_url
      },
      {
        name  = "REDIS_PORT",
        value = "6379"
      },
      {
        name  = "DEBUG",
        value = "csb:test:stress:run*"
      },
      {
        name  = "MOCK_PERSISTENCE_STORE",
        value = "true"
      },
      {
        name  = "PROCESSES_PER_CONTAINER",
        value = tostring(var.num_processes_per_container)
      }
      ],
      local.base_chain_override_td_env_config
    )

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

module "follower_ecs_sg" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "${local.name}_sg"
  description = "Security group for follower ECS task"
  vpc_id      = var.vpc_id

  // TODO - Need to check later if ingress to security group require or a particular CIDR range
  ingress_with_cidr_blocks = [
    {
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      description = "Allowing access from VPC CIDR range for now"
      cidr_blocks = data.aws_vpc.vpc.cidr_block
    },
  ]

  egress_cidr_blocks = ["0.0.0.0/0"]
  egress_rules       = ["all-all"]
}

resource "aws_ecs_service" "follower_ecs_service" {
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
    security_groups  = [module.follower_ecs_sg.security_group_id]
    subnets          = var.subnets
    assign_public_ip = false
  }

  timeouts {
    create = "60m"
    delete = "60m"
  }
  tags = local.custom_tags
}
