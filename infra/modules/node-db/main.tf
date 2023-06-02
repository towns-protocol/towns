module "global_constants" {
  source = "../global-constants"
}

locals {
  tags = merge(module.global_constants.tags, { Node_Name = "${var.dendrite_node_name}" })
}

resource "random_password" "rds_dendrite_node_postgresql_password" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "rds_dendrite_node_credentials" {
  name = "${module.global_constants.environment}-postgres-dendrite-${var.dendrite_node_name}-credentials"
  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "rds_dendrite_node_credentials" {
  secret_id     = aws_secretsmanager_secret.rds_dendrite_node_credentials.id
  secret_string = <<EOF
{
  "username": "dendrite",
  "database": "dendrite",
  "password": "${random_password.rds_dendrite_node_postgresql_password.result}",
  "engine": "postgres",
  "host": "${module.rds_aurora_postgresql.cluster_endpoint}",
  "port": ${module.rds_aurora_postgresql.cluster_port},
  "dbClusterIdentifier": "${module.rds_aurora_postgresql.cluster_id}",
  "dbConnectionString": "postgresql://dendrite:${random_password.rds_dendrite_node_postgresql_password.result}@${module.rds_aurora_postgresql.cluster_endpoint}:${module.rds_aurora_postgresql.cluster_port}/dendrite?sslmode=disable"
}
EOF
}

resource "random_password" "rds_dendrite_readonly_postgresql_password" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "rds_dendrite_readonly_credentials" {
  name = "${module.global_constants.environment}-postgres-dendrite-${var.dendrite_node_name}-readonly-credentials"
  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "rds_dendrite_readonly_credentials" {
  secret_id     = aws_secretsmanager_secret.rds_dendrite_readonly_credentials.id
  secret_string = <<EOF
{
  "username": "dendrite_readonly",
  "database": "dendrite",
  "password": "${random_password.rds_dendrite_readonly_postgresql_password.result}",
  "engine": "postgres",
  "host": "${module.rds_aurora_postgresql.cluster_endpoint}",
  "port": ${module.rds_aurora_postgresql.cluster_port},
  "dbClusterIdentifier": "${module.rds_aurora_postgresql.cluster_id}",
  "dbConnectionString": "postgresql://dendrite_readonly:${random_password.rds_dendrite_readonly_postgresql_password.result}@${module.rds_aurora_postgresql.cluster_endpoint}:${module.rds_aurora_postgresql.cluster_port}/dendrite?sslmode=disable"
}
EOF
}

data "aws_iam_role" "ecs_task_execution_role" {
  name = "ecsTaskExecutionRole"
}

# allow ecs_task_execution_role to read the secret but not write it

resource "aws_iam_role_policy" "ecs-to-dendrite-postgres-secret-policy" {
  name = "${module.global_constants.environment}-ecs-to-dendrite-postgres-secret-policy"
  role = data.aws_iam_role.ecs_task_execution_role.id

  depends_on = [
    aws_secretsmanager_secret_version.rds_dendrite_node_credentials
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
          "${aws_secretsmanager_secret.rds_dendrite_node_credentials.arn}"
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

  name              = "${module.global_constants.environment}-dendrite-${var.dendrite_node_name}-postgresql"
  engine            = "aurora-postgresql"
  engine_mode       = "provisioned"
  engine_version    = data.aws_rds_engine_version.postgresql.version
  storage_encrypted = true

  vpc_id                = var.vpc_id
  subnets               = var.database_subnets
  create_security_group = true

  allowed_cidr_blocks = var.allowed_cidr_blocks

  iam_role_name = "${var.dendrite_node_name}-${module.global_constants.environment}-dendrite-rds-postgresql-monitoring-role"
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