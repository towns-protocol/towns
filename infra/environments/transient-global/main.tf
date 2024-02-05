provider "aws" {
  region = "us-east-1"
}

# provider "datadog" {
#   api_key = var.datadog_api_key
#   app_key = var.datadog_app_key
# }

provider "cloudflare" {
  api_token = var.cloudflare_terraform_api_token
}


terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.13.1"
    }
    # datadog = {
    #   source = "DataDog/datadog"
    #   version = "3.32.0"
    # }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
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

  name = "river-vpc-${terraform.workspace}"
  cidr = "10.3.0.0/16"

  azs = ["us-east-1a", "us-east-1b"]

  public_subnets   = ["10.3.101.0/24", "10.3.102.0/24"]
  database_subnets = ["10.3.201.0/24", "10.3.202.0/24"]
  private_subnets  = ["10.3.1.0/24", "10.3.2.0/24"]

  enable_vpn_gateway     = false
  enable_nat_gateway     = true
  single_nat_gateway     = true
  one_nat_gateway_per_az = false

  tags = module.global_constants.tags

  enable_dns_hostnames = true
}

module "river_alb" {
  source = "../../modules/river-alb"

  subnets = module.vpc.public_subnets
  vpc_id  = module.vpc.vpc_id
}

resource "aws_ecs_cluster" "river_ecs_cluster" {
  name = "${terraform.workspace}-river-ecs-cluster"
  tags = module.global_constants.tags
}

module "river_node_ssl_cert" {
  source                       = "../../modules/river-node-ssl-cert"
  subnet_ids                   = module.vpc.private_subnets
  common_name                  = "*.nodes.transient.towns.com"
  challenge_dns_record_fq_name = "_acme-challenge.nodes.transient.towns.com"
}

module "pgadmin" {
  source          = "../../modules/pgadmin"
  vpc_id          = module.vpc.vpc_id
  public_subnets  = module.vpc.public_subnets
  private_subnets = module.vpc.private_subnets

  ecs_cluster = {
    id   = aws_ecs_cluster.river_ecs_cluster.id
    name = aws_ecs_cluster.river_ecs_cluster.name
  }

  alb_security_group_id  = module.river_alb.security_group_id
  alb_dns_name           = module.river_alb.lb_dns_name
  alb_https_listener_arn = module.river_alb.lb_https_listener_arn
}
