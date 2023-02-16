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
  }])

  volume {
    name = "postgres-data"
    host_path = "/mnt/zion-root/postgres/data"
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
    image = "docker.io/herenotthere/dendrite-monolith:1.0.31"
    essential = true
    portMappings = [{
      containerPort = 8008
      hostPort = 80
    }]

    environment = [
      # TODO: swap this one with AWS secret management service
      {
        name = "DATABASE_CONNECTION_STRING"
        value = "postgresql://dendrite:itsasecret@172.17.0.1:5432/dendrite?sslmode=disable"
      },
      {
        name = "SERVER_NAME",
        value = "node1.zion.xyz"
      },
      {
        name = "CHAIN_ID",
        value = "5"
      },
      # TODO: swap this one with AWS secret management service
      {
        name = "BLOCKCHAIN_PROVIDER_URL",
        value = "https://goerli.infura.io/v3/29b17e8631ca4c969a3972ac5a30daa2"
      },
      {
        name = "ENABLE_AUTHZ",
        value = "false"
      }
    ]


    command = ["--tls-cert=server.crt","--tls-key=server.key","--really-enable-open-registration", "--config=/usr/config/dendrite-zion.yaml"]

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