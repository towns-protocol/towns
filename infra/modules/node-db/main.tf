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

data "aws_rds_engine_version" "postgresql" {
  engine  = "aurora-postgresql"
  version = "14.6"
}

module "rds_aurora_postgresql" {
  source = "terraform-aws-modules/rds-aurora/aws"

  name              = "${module.global_constants.environment}-dendrite-${var.dendrite_node_name}-postgresql"
  engine            = "aurora-postgresql"
  engine_mode       = "provisioned"
  engine_version    = data.aws_rds_engine_version.postgresql.version
  storage_encrypted = true

  vpc_id                = var.vpc_id
  subnets               = var.database_subnets
  create_security_group = true

  allowed_cidr_blocks = var.allowed_cidr_blocks

  monitoring_interval = 0
  apply_immediately   = true
  skip_final_snapshot = false

  create_random_password = true
  random_password_length = 32

  tags = local.tags

  deletion_protection = true

  serverlessv2_scaling_configuration = {
    min_capacity = 2
    max_capacity = 10
  }

  instance_class = "db.serverless"
  instances = {
    one = {}
  }
}