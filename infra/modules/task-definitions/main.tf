module global_constants {
  source = "../global-constants"
}

data "aws_iam_role" "ecs_task_execution_role" {
  name = "ecsTaskExecutionRole"
}

resource "aws_ecs_task_definition" "dendrite-fargate" {
  family = "${module.global_constants.environment}-dendrite-fargate" 

  lifecycle {
    ignore_changes = [container_definitions]
  }

  network_mode = "awsvpc"

  task_role_arn         = data.aws_iam_role.ecs_task_execution_role.arn
  execution_role_arn    = data.aws_iam_role.ecs_task_execution_role.arn

  cpu                      = 2048
  memory                   = 4096

  requires_compatibilities = ["FARGATE"]

  container_definitions = jsonencode([{
    name  = "dendrite"
    image = "docker.io/herenotthere/dendrite-monolith:latest"
    essential = true
    portMappings = [{
      containerPort = 8008
      hostPort = 8008 
    }, {
      containerPort = 65432
      hostPort = 65432
    }]

    environment = [
      {
        name = "DATABASE_CONNECTION_STRING"
        value = ""
      },
      {
        name = "SERVER_NAME",
        value = ""
      },
      {
        name = "CHAIN_ID",
        value = ""
      },
      {
        name = "BLOCKCHAIN_PROVIDER_URL",
        value = ""
      },
      {
        name = "ENVIRONMENT",
        value = module.global_constants.environment
      }
    ]


    command = [
      "--tls-cert=server.crt",
      "--tls-key=server.key",
      "--really-enable-open-registration", 
      "--config=/usr/config/dendrite-zion.yaml"
    ]

    mountPoints = [{
      containerPath = "/etc/dendrite"
      sourceVolume = "etc-dendrite"
    }, {
      containerPath = "/var/dendrite/media",
      sourceVolume = "dendrite-media"
    }]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = var.dendrite_log_group_name
        "awslogs-region"        = "us-east-1"
        "awslogs-stream-prefix" = var.dendrite_node_name
      }
    }
  }])

  volume {
    name      = "etc-dendrite"
    efs_volume_configuration {
      file_system_id = var.dendrite_file_system_id
      root_directory = "/dendrite/etc-dendrite"
    }
  }

  volume {
    name      = "dendrite-media"
    efs_volume_configuration {
      file_system_id = var.dendrite_file_system_id
      root_directory = "/dendrite/media"
    }
  }

  tags = module.global_constants.tags
}
