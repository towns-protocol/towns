module "global_constants" {
  source = "../global-constants"
}

locals {
  tags = merge(
    module.global_constants.tags, {
      Node_Name = "${var.river_node_name}",
      Service   = "river-postgres-db"
  })
  restore_to_point_in_time = var.cow_cluster_source_identifier == null ? null : {
    source_cluster_identifier  = var.cow_cluster_source_identifier
    restore_type               = "copy-on-write"
    use_latest_restorable_time = true
  }
}

resource "random_password" "rds_river_node_postgresql_password" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "rds_river_node_credentials" {
  name = "${var.river_node_name}-postgres-db-secret"
  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "rds_river_node_credentials" {
  secret_id     = aws_secretsmanager_secret.rds_river_node_credentials.id
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

# allow ecs_task_execution_role to read the secret but not write it
resource "aws_iam_role_policy" "ecs-to-river-postgres-secret-policy" {
  name = "${var.river_node_name}-postgres-secret-policy"
  role = var.ecs_task_execution_role_id

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

data "aws_rds_engine_version" "postgresql" {
  engine  = "aurora-postgresql"
  version = "15.4"
}

module "rds_aurora_postgresql" {
  source = "terraform-aws-modules/rds-aurora/aws"

  version = "8.5.0"

  name              = "${var.river_node_name}-postgresql"
  engine            = "aurora-postgresql"
  engine_mode       = "provisioned"
  engine_version    = data.aws_rds_engine_version.postgresql.version
  storage_encrypted = true

  vpc_id                = var.vpc_id
  subnets               = var.database_subnets
  create_security_group = true

  monitoring_interval    = 0
  create_monitoring_role = false

  security_group_rules = {
    ex1_ingress = {
      cidr_blocks = var.allowed_cidr_blocks
    }
  }

  create_db_subnet_group = true

  apply_immediately = true

  # TODO: conditionally disable backups and snapshotting for transient dbs
  # to speed up deprovisioning
  # backup_retention_period  = 0
  # skip_final_snapshot      = true
  # restore_to_point_in_time = null

  restore_to_point_in_time  = local.restore_to_point_in_time
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.river_node_name}-postgresql-final-snapshot"

  enabled_cloudwatch_logs_exports = ["postgresql"]

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

  publicly_accessible = false
}
