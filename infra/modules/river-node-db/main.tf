module "global_constants" {
  source = "../global-constants"
}

locals {
  tags = merge(
    module.global_constants.tags, {
      Node_Name = "${var.river_node_name}",
      Service   = "river-postgres-db"
  })
  restore_to_point_in_time = var.is_transient ? {
    source_cluster_identifier  = var.cluster_source_identifier
    restore_type               = "copy-on-write"
    use_latest_restorable_time = true
  } : {}
  skip_final_snapshot                 = var.is_transient
  publicly_accessible                 = var.is_transient
  deletion_protection                 = !var.is_transient
  iam_database_authentication_enabled = true
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
    river_node_sg_ingress = {
      source_security_group_id = var.river_node_security_group_id
    }
    post_provision_config_lambda_function_sg_ingress = {
      source_security_group_id = var.post_provision_config_lambda_function_sg_id
    }
  }

  create_db_subnet_group = true

  apply_immediately = true

  restore_to_point_in_time = local.restore_to_point_in_time
  skip_final_snapshot      = local.skip_final_snapshot

  final_snapshot_identifier = "${var.river_node_name}-postgresql-final-snapshot"

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

  iam_database_authentication_enabled = local.iam_database_authentication_enabled
}


resource "aws_cloudwatch_log_subscription_filter" "rds_log_group_filter" {
  name            = "${var.river_node_name}-postgresql-river-log-group"
  log_group_name  = module.rds_aurora_postgresql.db_cluster_cloudwatch_log_groups["postgresql"].name
  filter_pattern  = ""
  destination_arn = module.global_constants.datadug_forwarder_stack_lambda.arn
}
