module "global_constants" {
  source = "../global-constants"
}

locals {
  tags = merge(
    module.global_constants.tags, {
      Service = "river-postgres-db"
  })
  restore_to_point_in_time = (var.is_transient && var.is_cloned) ? {
    source_cluster_identifier  = "arn:aws:rds:us-east-1:211286738967:cluster:gamma-river-db-postgresql-cluster"
    restore_type               = "copy-on-write"
    use_latest_restorable_time = true
  } : {}
  skip_final_snapshot = var.is_transient
  publicly_accessible = var.is_transient
  deletion_protection = !var.is_transient

  cluster_name = "${terraform.workspace}-river-db-postgresql-cluster"
}

data "aws_rds_engine_version" "postgresql" {
  engine  = "aurora-postgresql"
  version = "15.4"
}

module "rds_aurora_postgresql" {
  source = "terraform-aws-modules/rds-aurora/aws"

  version = "8.5.0"

  name              = local.cluster_name
  engine            = "aurora-postgresql"
  engine_mode       = "provisioned"
  engine_version    = data.aws_rds_engine_version.postgresql.version
  storage_encrypted = true

  vpc_id                = var.vpc_id
  subnets               = var.database_subnets
  create_security_group = true

  monitoring_interval    = 0
  create_monitoring_role = false

  master_username = "root"

  create_db_subnet_group = true

  apply_immediately = true

  restore_to_point_in_time = local.restore_to_point_in_time
  skip_final_snapshot      = local.skip_final_snapshot

  final_snapshot_identifier = "${local.cluster_name}-final-snapshot"

  enabled_cloudwatch_logs_exports = ["postgresql"]

  create_cloudwatch_log_group = true

  tags = local.tags

  deletion_protection = local.deletion_protection

  serverlessv2_scaling_configuration = {
    min_capacity = 4
    max_capacity = 10
  }

  instance_class = "db.serverless"
  instances = {
    one = {}
  }

  publicly_accessible = local.publicly_accessible

  iam_database_authentication_enabled = false
}

resource "aws_cloudwatch_log_subscription_filter" "rds_log_group_filter" {
  name            = "${local.cluster_name}-log-group"
  log_group_name  = module.rds_aurora_postgresql.db_cluster_cloudwatch_log_groups["postgresql"].name
  filter_pattern  = ""
  destination_arn = module.global_constants.datadug_forwarder_stack_lambda.arn
}

resource "aws_security_group_rule" "allow_public_access_for_transient_dbs" {
  count = var.is_transient ? 1 : 0

  type      = "ingress"
  from_port = 5432
  to_port   = 5432
  protocol  = "tcp"

  security_group_id = module.rds_aurora_postgresql.security_group_id

  description = "Allow public access to postgresql transient db"

  cidr_blocks = ["0.0.0.0/0"]
}

resource "aws_security_group_rule" "allow_pgadmin_inbound_to_db" {
  # var.pgadmin_security_group_id is of type any. so the count should be determined by
  # whether it exists.

  count     = var.pgadmin_security_group_id == null ? 0 : 1
  type      = "ingress"
  from_port = 5432
  to_port   = 5432
  protocol  = "tcp"

  security_group_id        = module.rds_aurora_postgresql.security_group_id
  source_security_group_id = var.pgadmin_security_group_id
}
