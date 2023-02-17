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
  public_subnets = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = false
  enable_vpn_gateway = false

  tags = module.global_constants.tags
}

module "zion_node" {
  source = "../../modules/zion-node"

  subnets = module.vpc.public_subnets
  vpc_cidr_block = module.vpc.vpc_cidr_block
  vpc_id = module.vpc.vpc_id
  zion_node_name = "node1"
}