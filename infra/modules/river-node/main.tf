module "global_constants" {
  source = "../global-constants"
}

data "aws_vpc" "vpc" {
  id = var.vpc_id
}

module "river_node_db" {
  source = "../../modules/river-node-db"

  database_subnets    = var.database_subnets
  allowed_cidr_blocks = var.database_allowed_cidr_blocks
  vpc_id              = var.vpc_id
  river_node_name     = var.node_name
}

# Behind the load balancer
module "river_internal_sg" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "${module.global_constants.environment}_river_internal_sg"
  description = "Security group for river nodes"
  vpc_id      = var.vpc_id


  # Open for security group id (rule or from_port+to_port+protocol+description)
  ingress_with_source_security_group_id = [
    {
      rule                     = "http-80-tcp"
      source_security_group_id = var.alb_security_group_id
    },
    {
      protocol                 = "tcp"
      from_port                = 5157
      to_port                  = 5157
      source_security_group_id = var.alb_security_group_id
    },
  ]

  egress_cidr_blocks = ["0.0.0.0/0"] # public internet
  egress_rules       = ["all-all"]
}

data "aws_iam_role" "ecs_task_execution_role" {
  name = "ecsTaskExecutionRole"
}

resource "aws_cloudwatch_log_group" "river_log_group" {
  name = "/${module.global_constants.environment}/ecs/river/${var.node_name}"

  tags = merge(
    module.global_constants.tags,
    {
      Service_Name = "river-node",
      Node_Name    = var.node_name
    }
  )
}

resource "aws_ecs_task_definition" "river-fargate" {
  family = "${module.global_constants.environment}-river-fargate"


  network_mode = "awsvpc"

  task_role_arn      = data.aws_iam_role.ecs_task_execution_role.arn
  execution_role_arn = data.aws_iam_role.ecs_task_execution_role.arn

  cpu    = 2048
  memory = 4096

  requires_compatibilities = ["FARGATE"]

  ipc_mode = null

  pid_mode = null

  container_definitions = jsonencode([{
    name      = "river-node"
    image     = "docker.io/herenotthere/river-node:latest"
    essential = true
    portMappings = [{
      containerPort = 5157
      hostPort      = 5157
      protocol      = "tcp"
    }]

    repositoryCredentials = {
        credentialsParameter = "arn:aws:secretsmanager:us-east-1:211286738967:secret:dockerhub-QpT8Jf"
    },

    secrets = [
      {
        name      = "DBURL"
        valueFrom = "${module.river_node_db.rds_river_node_credentials_arn}:dbConnectionString::"
      },
      {
        name      = "WALLETPRIVATEKEY"
        valueFrom = "${module.river_node_db.river_node_wallet_credentials_arn}:walletPathPrivateKey::"
      }
    ]

    environment = [
      {
        name  = "CHAIN__CHAINID",
        value = ""
      },
      {
        name  = "CHAIN__NETWORKURL",
        value = ""
      },
      {
        name  = "METRICS__ENABLED",
        value = "false"
      },
      {
        name = "STORAGE_TYPE",
        value = "postgres"
      },
      {
        name = "SKIP_GENKEY",
        value = "true"
      },
      {
        name = "LOG__FORMAT",
        value = "json"
      },
      {
        name = "LOG__LEVEL",
        value = "info"
      },
      {
        name = "LOG__NOCOLOR",
        value = "true"
      },
      {
        name = "PUSHNOTIFICATION__AUTHTOKEN",
        value = ""
      },
      {
        name = "PUSHNOTIFICATION__URL",
        value = ""
      }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.river_log_group.name
        "awslogs-region"        = "us-east-1"
        "awslogs-stream-prefix" = var.node_name
      }
    }
  }])

  tags = module.global_constants.tags
}

data "aws_alb_target_group" "blue" {
  arn = var.river_node_blue_target_group_arn
}

data "aws_alb_target_group" "green" {
  arn = var.river_node_green_target_group_arn
}

resource "aws_codedeploy_app" "river-node-code-deploy-app" {
  compute_platform = "ECS"
  name             = "${module.global_constants.environment}-river-${var.node_name}-codedeploy-app"
}

resource "aws_iam_role" "ecs_code_deploy_role" {
  name                = "${module.global_constants.environment}-river-${var.node_name}-ecs-code-deploy-role"
  managed_policy_arns = ["arn:aws:iam::aws:policy/AWSCodeDeployRoleForECS"]


  assume_role_policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Sid" : "",
        "Effect" : "Allow",
        "Principal" : {
          "Service" : "codedeploy.amazonaws.com"
        },
        "Action" : "sts:AssumeRole"
      }
    ]
  })

  tags = module.global_constants.tags
}

resource "aws_ecs_service" "river-ecs-service" {
  name                               = "${module.global_constants.environment}-river-${var.node_name}-fargate-service"
  cluster                            = var.ecs_cluster_id
  task_definition                    = aws_ecs_task_definition.river-fargate.arn
  desired_count                      = 1
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100

  launch_type      = "FARGATE"
  platform_version = "1.4.0"

  deployment_controller {
    type = "CODE_DEPLOY"
  }

  lifecycle {
    ignore_changes = [task_definition, desired_count, load_balancer]
  }

  load_balancer {
    target_group_arn = var.river_node_blue_target_group_arn
    container_name   = "river-node"
    container_port   = 5157
  }

  network_configuration {
    security_groups  = [module.river_internal_sg.security_group_id]
    subnets          = var.node_subnets
    assign_public_ip = true
  }
}

resource "aws_codedeploy_deployment_group" "codedeploy_deployment_group" {
  lifecycle {
    ignore_changes = all
  }
  app_name               = aws_codedeploy_app.river-node-code-deploy-app.name
  deployment_group_name  = "${module.global_constants.environment}-river-${var.node_name}-codedeploy-deployment-group"
  service_role_arn       = aws_iam_role.ecs_code_deploy_role.arn
  deployment_config_name = "CodeDeployDefault.ECSAllAtOnce"

  depends_on = [aws_ecs_service.river-ecs-service]

  ecs_service {
    cluster_name = var.ecs_cluster_name
    service_name = aws_ecs_service.river-ecs-service.name
  }

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE"]
  }

  deployment_style {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "BLUE_GREEN"
  }

  blue_green_deployment_config {
    deployment_ready_option {
      action_on_timeout    = "CONTINUE_DEPLOYMENT"
      wait_time_in_minutes = 0
    }

    terminate_blue_instances_on_deployment_success {
      action                           = "TERMINATE"
      termination_wait_time_in_minutes = 0
    }
  }

  load_balancer_info {
    target_group_pair_info {
      target_group {
        name = data.aws_alb_target_group.blue.name
      }

      target_group {
        name = data.aws_alb_target_group.green.name
      }

      prod_traffic_route {
        listener_arns = [var.river_https_listener_arn]
      }
    }
  }
}