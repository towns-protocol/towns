module "global_constants" {
  source = "../global-constants"
}

locals {
  tags = merge(
    module.global_constants.tags, {
      Service = "river-postgres-db"
  })

  cluster_name = "${terraform.workspace}-river-db${var.cluster_name_suffix}"
}

data "aws_rds_engine_version" "postgresql" {
  engine  = "aurora-postgresql"
  version = "15.4"
}

resource "aws_rds_cluster_parameter_group" "river_db_paramater_group" {
  name        = "${local.cluster_name}-parameter-group"
  family      = "aurora-postgresql15"
  description = "Custom parameter group for river db cluster"

  parameter {
    apply_method = "pending-reboot"
    name         = "max_connections"

    # this is the maximum supported value for max_connections
    value = "16000"
  }
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
  performance_insights_enabled = false

  master_username = "root"

  create_db_subnet_group = true

  apply_immediately = true

  skip_final_snapshot = false

  final_snapshot_identifier = "${local.cluster_name}-final-snapshot"

  create_cloudwatch_log_group = false

  tags = local.tags

  deletion_protection = false

  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.river_db_paramater_group.name

  serverlessv2_scaling_configuration = {
    min_capacity = var.min_capacity
    max_capacity = var.max_capacity
  }

  instance_class = "db.serverless"
  instances = var.migration_config.delete_rds_instance ? {} : {
    one = {}
  }

  publicly_accessible = var.migration_config.rds_public_access

  iam_database_authentication_enabled = false
}

resource "aws_vpc_security_group_ingress_rule" "allow_public_inbound_to_db" {
  description = "Allow public inbound to the river node db cluster"

  count = var.migration_config.rds_public_access ? 1 : 0

  from_port   = 5432
  to_port     = 5432
  ip_protocol = "tcp"

  security_group_id = module.rds_aurora_postgresql.security_group_id

  cidr_ipv4 = "0.0.0.0/0"
}
