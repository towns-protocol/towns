module global_constants {
  source = "../global-constants"
}

locals {
  dendrite_log_group_name = "/${module.global_constants.environment}/ecs/zion/dendrite"
  postgres_log_group_name = "/${module.global_constants.environment}/ecs/zion/postgres"
}

data "aws_iam_role" "ecs_task_execution_role" {
  name = "ecsTaskExecutionRole"
}

resource "aws_cloudwatch_log_group" "dendrite_log_group" {
  name = local.dendrite_log_group_name
  tags = module.global_constants.tags
}

resource "aws_cloudwatch_log_group" "postgres_log_group" {
  name = local.postgres_log_group_name
  tags = module.global_constants.tags
}

resource "aws_ecs_task_definition" "postgres" {
  family = "${module.global_constants.environment}-zion-postgres" 

  network_mode = "bridge"

  task_role_arn         = data.aws_iam_role.ecs_task_execution_role.arn
  execution_role_arn    = data.aws_iam_role.ecs_task_execution_role.arn

  cpu                      = 512
  memory                   = 1024

  requires_compatibilities = ["EC2"]

  container_definitions = jsonencode([{
    name  = "postgres"
    image = "postgres:14"
    essential = true
    portMappings = [{
      containerPort = 5432
      hostPort = 5432
    }]

    environment = [
      # TODO: how do we get these environment variables to be secrets?
      {
        name = "POSTGRES_PASSWORD"
        value = "itsasecret"
      },
      {
        name = "POSTGRES_USER"
        value = "dendrite"
      }
    ]

    mountPoints = [{
      containerPath = "/var/lib/postgresql/data"
      sourceVolume = "postgres-data"
    }, {
      containerPath = "/docker-entrypoint-initdb.d/20-create-db.sh",
      sourceVolume = "postgres-init"
    }]

    logConfiguration = {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": local.postgres_log_group_name,  
        "awslogs-region": module.global_constants.region, 
        "awslogs-stream-prefix": "ecs"
      }
    }

  }])

  volume {
    name = "postgres-data"
    host_path = "/mnt/zion-root/postgres/data"
  }

  volume {
    name = "postgres-init"
    host_path = "/mnt/zion-root/postgres/create_db.sh"
  }

  tags = module.global_constants.tags
}

resource "aws_ecs_task_definition" "dendrite" {
  family = "${module.global_constants.environment}-zion-dendrite" 

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

    command = ["--tls-cert=server.crt","--tls-key=server.key","--really-enable-open-registration"]

    mountPoints = [{
      containerPath = "/etc/dendrite"
      sourceVolume = "etc-dendrite"
    }, {
      containerPath = "/var/dendrite/media",
      sourceVolume = "dendrite-media"
    }]

    logConfiguration = {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": local.dendrite_log_group_name,  
        "awslogs-region": module.global_constants.region,
        "awslogs-stream-prefix": "ecs"
      }
    }

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