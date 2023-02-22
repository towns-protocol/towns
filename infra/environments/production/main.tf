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

  name = "zion-vpc-${module.global_constants.environment}"
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

module "zion_node" {
  source = "../../modules/zion-node"

  subnets = module.vpc.public_subnets
  vpc_cidr_block = module.vpc.vpc_cidr_block
  vpc_id = module.vpc.vpc_id
  zion_node_name = "node1"
  bastion_host_security_group_id = module.bastion_host.bastion_sg_id
}

module "dendrite_node_db" {
  source = "../../modules/node-db"

  database_subnets = module.vpc.database_subnets
  allowed_cidr_blocks = concat(
    # TODO: remove public subnets once we move to fargate
    module.vpc.public_subnets_cidr_blocks,
    module.vpc.private_subnets_cidr_blocks
  )
  vpc_id = module.vpc.vpc_id
  dendrite_node_name = "node1"
}
