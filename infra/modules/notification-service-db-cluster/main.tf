module "global_constants" {
  source = "../global-constants"
}

locals {
  prefix       = var.name_prefix == "" ? "" : "${var.name_prefix}-"
  service_name = "${local.prefix}notification-service-db-cluster"
  cluster_name = "${terraform.workspace}-${local.service_name}"

  tags = merge(
    module.global_constants.tags, {
      Service = local.service_name
  })
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
  performance_insights_enabled = false

  master_username = "root"

  create_db_subnet_group = true

  apply_immediately = true

  skip_final_snapshot = false

  final_snapshot_identifier = "${local.cluster_name}-final-snapshot"

  tags = local.tags

  deletion_protection = true

  serverlessv2_scaling_configuration = {
    min_capacity = 0.5
    max_capacity = 10
  }

  instance_class = "db.serverless"
  instances = {
    one = {}
  }

  publicly_accessible = var.allow_db_public_access

  iam_database_authentication_enabled = false
}

resource "aws_vpc_security_group_ingress_rule" "allow_pgadmin_inbound_to_db" {
  description = "Allow pgadmin inbound to notification service db cluster"

  from_port   = 5432
  to_port     = 5432
  ip_protocol = "tcp"

  security_group_id            = module.rds_aurora_postgresql.security_group_id
  referenced_security_group_id = var.pgadmin_security_group_id

  tags = local.tags
}

resource "aws_vpc_security_group_ingress_rule" "allow_public_inbound_to_db" {
  description = "Allow public inbound to notification service db cluster"

  count = var.allow_db_public_access ? 1 : 0

  from_port   = 5432
  to_port     = 5432
  ip_protocol = "tcp"

  security_group_id = module.rds_aurora_postgresql.security_group_id

  cidr_ipv4 = "0.0.0.0/0"
}
