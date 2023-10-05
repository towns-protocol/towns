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

  name = "river-vpc-${module.global_constants.environment}"
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
  river_ecs_cluster_name = "${module.global_constants.environment}-river-ecs-cluster"
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
    module.river_alb,
    aws_cloudwatch_log_group.river_log_group,
  ]

  ecs_cluster_id   = aws_ecs_cluster.river_ecs_cluster.id
  ecs_cluster_name = local.river_ecs_cluster_name

  node_subnets                   = module.vpc.private_subnets
  vpc_id                         = module.vpc.vpc_id
  node_name                      = "river-1-test"
  log_group_name                 = aws_cloudwatch_log_group.river_log_group.name

  alb_security_group_id             = module.river_alb.security_group_id
  river_https_listener_arn          = module.river_alb.river_https_listener_arn
  river_node_blue_target_group_arn  = module.river_alb.river_node_blue_target_group_arn
  river_node_green_target_group_arn = module.river_alb.river_node_green_target_group_arn

  database_allowed_cidr_blocks = module.vpc.private_subnets_cidr_blocks
  database_subnets             = module.vpc.database_subnets
}
