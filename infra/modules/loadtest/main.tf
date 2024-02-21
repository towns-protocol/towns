module "global_constants" {
  source = "../global-constants"
}

data "aws_vpc" "vpc" {
  id = var.vpc_id
}

resource "aws_elasticache_subnet_group" "redis" {
  name       = "loadtest-${terraform.workspace}"
  subnet_ids = var.private_subnets
}

resource "aws_ecs_cluster" "loadtest_cluster" {
  name = "loadtest-cluster-${terraform.workspace}"
  tags = module.global_constants.tags
}

module "redis_sg" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "loadtest-${terraform.workspace}_sg"
  description = "Security group for redis"
  vpc_id      = var.vpc_id

  ingress_with_cidr_blocks = [
    {
      from_port   = 6379
      to_port     = 6379
      protocol    = "tcp"
      description = "Allowing access from VPC CIDR range for now"
      cidr_blocks = data.aws_vpc.vpc.cidr_block
    },
  ]

  egress_cidr_blocks = ["0.0.0.0/0"]
  egress_rules       = ["all-all"]
}

locals {
  # TODO: we should allow this to be configured at runtime, not infra time.
  num_follower_containers     = 5
  num_processes_per_container = 2
  num_clients_per_process     = 2 
  num_followers               = local.num_follower_containers * local.num_processes_per_container * local.num_clients_per_process
  loadtest_duration           = 600000
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "loadtest-${terraform.workspace}"
  engine               = "redis"
  node_type            = "cache.t2.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  engine_version       = "7.1"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.redis.name
  security_group_ids   = toset([module.redis_sg.security_group_id])
  // TODO: redis should shut down after 30 minutes of inactivity
}

module "leader" {
  source                  = "./leader"
  vpc_id                  = var.vpc_id
  subnets                 = var.private_subnets
  ecs_cluster             = aws_ecs_cluster.loadtest_cluster
  base_chain_rpc_url      = var.base_chain_rpc_url
  river_node_url          = var.river_node_url
  redis_url               = aws_elasticache_cluster.redis.cache_nodes[0].address
  num_followers           = local.num_followers
  num_follower_containers = local.num_follower_containers
  loadtest_duration       = local.loadtest_duration


  tags = module.global_constants.tags
}

module "follower" {
  count                       = local.num_follower_containers
  follower_id                 = count.index + 1
  source                      = "./follower"
  vpc_id                      = var.vpc_id
  subnets                     = var.private_subnets
  ecs_cluster                 = aws_ecs_cluster.loadtest_cluster
  base_chain_rpc_url          = var.base_chain_rpc_url
  river_node_url              = var.river_node_url
  redis_url                   = aws_elasticache_cluster.redis.cache_nodes[0].address
  loadtest_duration           = local.loadtest_duration
  num_processes_per_container = local.num_processes_per_container
  num_clients_per_process     = local.num_clients_per_process
  tags                        = module.global_constants.tags
}
