module global_constants {
  source = "../global-constants"
}

locals {
  dendrite_log_group_name = "/${module.global_constants.environment}/ecs/zion/dendrite"
}

data "aws_iam_role" "ecs_task_execution_role" {
  name = "ecsTaskExecutionRole"
}

# TODO: reconfigure logz.io with FARGATE


# TODO: DELETE THIS TD
resource "aws_ecs_task_definition" "dendrite" {
  family = "${module.global_constants.environment}-zion-dendrite" 

  lifecycle {
    ignore_changes = [container_definitions]
  }

  network_mode = "bridge"

  task_role_arn         = data.aws_iam_role.ecs_task_execution_role.arn
  execution_role_arn    = data.aws_iam_role.ecs_task_execution_role.arn

  cpu                      = 512
  memory                   = 1024

  requires_compatibilities = ["EC2"]

  container_definitions = jsonencode([{
    name  = "dendrite"
    image = "docker.io/herenotthere/dendrite-monolith:latest"
    essential = true
    portMappings = [{
      containerPort = 8008
      hostPort = 80
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
  }])

  volume {
    name = "etc-dendrite"
    host_path = "/mnt/zion-root/dendrite/etc-dendrite"
  }

  volume {
    name = "dendrite-media"
    host_path = "/mnt/zion-root/dendrite/media"
  }

  tags = module.global_constants.tags
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
      hostPort = 8008 # TODO: make the alb hit this port instead of 80
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