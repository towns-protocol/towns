module "global_constants" {
  source = "../global-constants"
}

locals {
  tags = merge(
    module.global_constants.tags, { 
      Node_Name = "${var.river_node_name}", 
    })
}

resource "random_password" "rds_river_node_postgresql_password" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "rds_river_node_credentials" {
  name = "${module.global_constants.environment}-postgres-river-${var.river_node_name}-credentials"
  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "rds_river_node_credentials" {
  secret_id     = aws_secretsmanager_secret.rds_river_node_credentials.id
  lifecycle {
    ignore_changes = all
  }
  secret_string = <<EOF
{
  "username": "river",
  "database": "river",
  "password": "${random_password.rds_river_node_postgresql_password.result}",
  "engine": "postgres",
  "host": "${module.rds_aurora_postgresql.cluster_endpoint}",
  "port": ${module.rds_aurora_postgresql.cluster_port},
  "dbClusterIdentifier": "${module.rds_aurora_postgresql.cluster_id}",
  "dbConnectionString": "postgresql://river:${random_password.rds_river_node_postgresql_password.result}@${module.rds_aurora_postgresql.cluster_endpoint}:${module.rds_aurora_postgresql.cluster_port}/river?sslmode=disable&pool_max_conns=1000"
}
EOF
}

resource "aws_secretsmanager_secret" "river_node_wallet_credentials" {
  name = "${module.global_constants.environment}-river-${var.river_node_name}-wallet-secret"
  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "river_node_wallet_credentials" {
  secret_id     = aws_secretsmanager_secret.river_node_wallet_credentials.id
  secret_string = <<EOF
{
  "walletPathPrivateKey": "DUMMY"
}
EOF
}


data "aws_iam_role" "ecs_task_execution_role" {
  name = "ecsTaskExecutionRole"
}

# allow ecs_task_execution_role to read the secret but not write it
resource "aws_iam_role_policy" "ecs-to-river-postgres-secret-policy" {
  name = "${module.global_constants.environment}-ecs-to-river-postgres-secret-policy"
  role = data.aws_iam_role.ecs_task_execution_role.id

  lifecycle {
    ignore_changes = all
  }

  depends_on = [
    aws_secretsmanager_secret_version.rds_river_node_credentials
  ]

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
          "${aws_secretsmanager_secret.rds_river_node_credentials.arn}"
        ]
      }
    ]
  }
  EOF
}

# allow ecs_task_execution_role to read the secret but not write it
resource "aws_iam_role_policy" "ecs-to-wallet-secret-policy" {
  name = "${module.global_constants.environment}-ecs-to-wallet-secret-policy"
  role = data.aws_iam_role.ecs_task_execution_role.id

  lifecycle {
    ignore_changes = all
  }

  depends_on = [
    aws_secretsmanager_secret_version.river_node_wallet_credentials
  ]

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
          "${aws_secretsmanager_secret.river_node_wallet_credentials.arn}"
        ]
      }
    ]
  }
  EOF
}

data "aws_rds_engine_version" "postgresql" {
  engine  = "aurora-postgresql"
  version = "14.6"
}

module "rds_aurora_postgresql" {
  source = "terraform-aws-modules/rds-aurora/aws"

  version = "7.7.0"

  name              = "${module.global_constants.environment}-river-${var.river_node_name}-postgresql"
  engine            = "aurora-postgresql"
  engine_mode       = "provisioned"
  engine_version    = data.aws_rds_engine_version.postgresql.version
  storage_encrypted = true

  vpc_id                = var.vpc_id
  subnets               = var.database_subnets
  create_security_group = true

  allowed_cidr_blocks = var.allowed_cidr_blocks

  iam_role_name       = "${var.river_node_name}-${module.global_constants.environment}-river-rds-postgresql-monitoring-role"
  monitoring_interval = 60
  apply_immediately   = true
  skip_final_snapshot = false

  enabled_cloudwatch_logs_exports = ["postgresql"]

  create_random_password = true
  random_password_length = 32

  tags = local.tags

  deletion_protection = true

  serverlessv2_scaling_configuration = {
    min_capacity = 4
    max_capacity = 10
  }

  instance_class = "db.serverless"
  instances = {
    one = {}
  }
}
