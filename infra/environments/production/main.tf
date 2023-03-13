provider "aws" {
  region = "us-east-1"
  profile = "harmony-github-actions"
}

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.16"
    }
  }

  backend "s3" {}

  required_version = ">= 1.0.3"
}

module global_constants {
  source = "../../modules/global-constants"
}

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "dendrite-vpc-${module.global_constants.environment}"
  cidr = "10.0.0.0/16"

  azs = ["us-east-1a", "us-east-1b"]

  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]
  database_subnets = ["10.0.201.0/24", "10.0.202.0/24"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]

  enable_vpn_gateway = false
  enable_nat_gateway = true
  single_nat_gateway = true
  one_nat_gateway_per_az = false

  tags = module.global_constants.tags

  enable_dns_hostnames = true
}


module "bastion_host" {
  source = "../../modules/bastion-host"

  subnet_id = module.vpc.public_subnets[0]
  vpc_id = module.vpc.vpc_id
}

resource "aws_cloudwatch_log_group" "dendrite_log_group" {
  name = "/${module.global_constants.environment}/ecs/dendrite"
  tags = module.global_constants.tags
}

resource "aws_ecs_cluster" "dendrite_ecs_cluster" {
  name = "${module.global_constants.environment}-dendrite-ecs-cluster"
}


module "dendrite_alb" {
  source = "../../modules/dendrite-alb"

  subnets = module.vpc.public_subnets
  vpc_id = module.vpc.vpc_id
}

module "dendrite_node" {
  source = "../../modules/dendrite-node"

  ecs_cluster_id = aws_ecs_cluster.dendrite_ecs_cluster.id
  dendrite_node_subnets = module.vpc.private_subnets
  vpc_id = module.vpc.vpc_id
  dendrite_node_name = "node1"
  bastion_host_security_group_id = module.bastion_host.bastion_sg_id
  dendrite_log_group_name = aws_cloudwatch_log_group.dendrite_log_group.name

  dendrite_alb_security_group_id = module.dendrite_alb.security_group_id
  dendrite_server_target_group_arn = module.dendrite_alb.target_group_arns[0]
  dendrite_profiler_target_group_arn = module.dendrite_alb.target_group_arns[1] 

  dendrite_node_cidr_blocks = module.vpc.private_subnets_cidr_blocks
  database_subnets = module.vpc.database_subnets
}