provider "aws" {
  region  = "us-east-1"
  profile = "harmony-github-actions"
}

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.13.1"
    }
  }

  backend "s3" {}

  required_version = ">= 1.0.3"
}

module "global_constants" {
  source = "../../modules/global-constants"
}

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "dendrite-vpc-${module.global_constants.environment}"
  cidr = "10.1.0.0/16"

  azs = ["us-east-1a", "us-east-1b"]

  public_subnets   = ["10.1.101.0/24", "10.1.102.0/24"]
  database_subnets = ["10.1.201.0/24", "10.1.202.0/24"]
  private_subnets  = ["10.1.1.0/24", "10.1.2.0/24"]

  enable_vpn_gateway     = false
  enable_nat_gateway     = true
  single_nat_gateway     = true
  one_nat_gateway_per_az = false

  tags = module.global_constants.tags

  enable_dns_hostnames = true
}

locals {
  ecs_cluster_name       = "${module.global_constants.environment}-dendrite-ecs-cluster"
  river_ecs_cluster_name = "${module.global_constants.environment}-river-ecs-cluster"
}

module "bastion_host" {
  source = "../../modules/bastion-host"

  subnet_id = module.vpc.public_subnets[0]
  vpc_id    = module.vpc.vpc_id
}

resource "aws_cloudwatch_log_group" "dendrite_log_group" {
  name = "/${module.global_constants.environment}/ecs/dendrite"
  tags = module.global_constants.tags
}

resource "aws_ecs_cluster" "dendrite_ecs_cluster" {
  name = local.ecs_cluster_name
}

module "dendrite_alb" {
  source = "../../modules/dendrite-alb"

  subnets           = module.vpc.public_subnets
  vpc_id            = module.vpc.vpc_id
  pgadmin_subdomain = "node1-test"
}

module "pgadmin" {
  source                         = "../../modules/pgadmin"
  subnets                        = module.vpc.private_subnets
  dendrite_alb_security_group_id = module.dendrite_alb.security_group_id
  vpc_id                         = module.vpc.vpc_id
  target_group_arn               = module.dendrite_alb.pgadmin_target_group_arn
  ecs_cluster_id                 = aws_ecs_cluster.dendrite_ecs_cluster.id
}

module "dendrite_node" {
  source = "../../modules/dendrite-node"

  depends_on = [
    module.vpc,
    module.bastion_host,
    module.dendrite_alb,
    aws_cloudwatch_log_group.dendrite_log_group,
    module.pgadmin
  ]

  ecs_cluster_id   = aws_ecs_cluster.dendrite_ecs_cluster.id
  ecs_cluster_name = local.ecs_cluster_name

  dendrite_node_subnets          = module.vpc.private_subnets
  vpc_id                         = module.vpc.vpc_id
  dendrite_node_name             = "node1-test"
  bastion_host_security_group_id = module.bastion_host.bastion_sg_id
  dendrite_log_group_name        = aws_cloudwatch_log_group.dendrite_log_group.name

  dendrite_https_listener_arn            = module.dendrite_alb.dendrite_https_listener_arn
  dendrite_alb_security_group_id         = module.dendrite_alb.security_group_id
  dendrite_server_blue_target_group_arn  = module.dendrite_alb.dendrite_server_blue_target_group_arn
  dendrite_server_green_target_group_arn = module.dendrite_alb.dendrite_server_green_target_group_arn
  dendrite_profiler_target_group_arn     = module.dendrite_alb.dendrite_profiler_target_group_arn

  database_allowed_cidr_blocks = module.vpc.private_subnets_cidr_blocks
  database_subnets             = module.vpc.database_subnets
}

resource "aws_cloudwatch_log_group" "river_log_group" {
  name = "/${module.global_constants.environment}/ecs/river"
  tags = module.global_constants.tags
}

resource "aws_ecs_cluster" "river_ecs_cluster" {
  name = local.river_ecs_cluster_name
}

module "river_alb" {
  source = "../../modules/river-alb"

  subnets = module.vpc.public_subnets
  vpc_id  = module.vpc.vpc_id
}

module "river_node" {
  source = "../../modules/river-node"

  depends_on = [
    module.vpc,
    module.bastion_host,
    module.river_alb,
    aws_cloudwatch_log_group.river_log_group,
  ]

  ecs_cluster_id   = aws_ecs_cluster.river_ecs_cluster.id
  ecs_cluster_name = local.river_ecs_cluster_name

  node_subnets                   = module.vpc.private_subnets
  vpc_id                         = module.vpc.vpc_id
  node_name                      = "river-1-test"
  bastion_host_security_group_id = module.bastion_host.bastion_sg_id
  log_group_name                 = aws_cloudwatch_log_group.river_log_group.name

  alb_security_group_id             = module.river_alb.security_group_id
  river_https_listener_arn          = module.river_alb.river_https_listener_arn
  river_node_blue_target_group_arn  = module.river_alb.river_node_blue_target_group_arn
  river_node_green_target_group_arn = module.river_alb.river_node_green_target_group_arn

  database_allowed_cidr_blocks = module.vpc.private_subnets_cidr_blocks
  database_subnets             = module.vpc.database_subnets
}
