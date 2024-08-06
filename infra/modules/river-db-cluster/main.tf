module "global_constants" {
  source = "../global-constants"
}

locals {
  tags = merge(
    module.global_constants.tags, {
      Service = "river-postgres-db"
  })

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

  monitoring_interval          = 0
  create_monitoring_role       = false
  performance_insights_enabled = true

  master_username = "root"

  create_db_subnet_group = true

  apply_immediately = true

  skip_final_snapshot = false

  final_snapshot_identifier = "${local.cluster_name}-final-snapshot"

  enabled_cloudwatch_logs_exports = ["postgresql"]

  create_cloudwatch_log_group = true

  tags = local.tags

  deletion_protection = true

  serverlessv2_scaling_configuration = {
    min_capacity = 4
    max_capacity = 20
  }

  instance_class = "db.serverless"
  instances = {
    one = {}
  }

  publicly_accessible = false

  iam_database_authentication_enabled = false
}

resource "aws_cloudwatch_log_subscription_filter" "rds_log_group_filter" {
  name            = "${local.cluster_name}-log-group"
  log_group_name  = module.rds_aurora_postgresql.db_cluster_cloudwatch_log_groups["postgresql"].name
  filter_pattern  = ""
  destination_arn = module.global_constants.datadug_forwarder_stack_lambda.arn
}

resource "aws_vpc_security_group_ingress_rule" "allow_pgadmin_inbound_to_db" {
  description = "Allow pgadmin inbound to db"

  from_port   = 5432
  to_port     = 5432
  ip_protocol = -1

  security_group_id            = module.rds_aurora_postgresql.security_group_id
  referenced_security_group_id = var.pgadmin_security_group_id

  tags = local.tags
}
