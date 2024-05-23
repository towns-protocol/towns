module "global_constants" {
  source = "../global-constants"
}

data "aws_vpc" "vpc" {
  id = var.vpc_id
}

resource "aws_elasticache_subnet_group" "redis" {
  name       = "stress-test-${terraform.workspace}"
  subnet_ids = var.private_subnets
}

resource "aws_ecs_cluster" "stress_test_cluster" {
  name = "stress-test-cluster-${terraform.workspace}"
  tags = module.global_constants.tags
}

# module "redis_sg" {
#   source = "terraform-aws-modules/security-group/aws"

#   name        = "stress-test-${terraform.workspace}_sg"
#   description = "Security group for redis"
#   vpc_id      = var.vpc_id

#   ingress_with_cidr_blocks = [
#     {
#       from_port   = 6379
#       to_port     = 6379
#       protocol    = "tcp"
#       description = "Allowing access from VPC CIDR range for now"
#       cidr_blocks = data.aws_vpc.vpc.cidr_block
#     },
#   ]

#   egress_cidr_blocks = ["0.0.0.0/0"]
#   egress_rules       = ["all-all"]
# }

locals {
  container_count = 100
}

resource "aws_secretsmanager_secret" "stress_test_wallet_mnemonic" {
  name = "stress-test-wallet-mnemonic-${terraform.workspace}"
}

# resource "aws_elasticache_cluster" "redis" {
#   cluster_id           = "stress-test-${terraform.workspace}"
#   engine               = "redis"
#   node_type            = "cache.t2.micro"
#   num_cache_nodes      = 1
#   parameter_group_name = "default.redis7"
#   engine_version       = "7.1"
#   port                 = 6379
#   subnet_group_name    = aws_elasticache_subnet_group.redis.name
#   security_group_ids   = toset([module.redis_sg.security_group_id])
#   // TODO: redis should shut down after 30 minutes of inactivity
# }

module "stress-test-system-parameters" {
  source = "./stress-test-parameters"
}

module "stress_node_ecs_sg" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "stress-test-node-ecs-sg-${terraform.workspace}"
  description = "Security group for the stress test node ECS Task"
  vpc_id      = var.vpc_id

  egress_cidr_blocks = ["0.0.0.0/0"]
  egress_rules       = ["all-all"]
}

module "stress-test-nodes" {
  source = "./stress-test-nodes"

  count = local.container_count

  vpc_id  = var.vpc_id
  subnets = var.private_subnets

  ecs_cluster                    = aws_ecs_cluster.stress_test_cluster
  base_chain_rpc_url_secret_arn  = var.base_chain_rpc_url_secret_arn
  river_chain_rpc_url_secret_arn = var.river_chain_rpc_url_secret_arn

  security_group_id = module.stress_node_ecs_sg.security_group_id

  container_index = count.index

  stress_test_wallet_mnemonic_secret_arn = aws_secretsmanager_secret.stress_test_wallet_mnemonic.arn
  system_parameters                      = module.stress-test-system-parameters

  tags = module.global_constants.tags
}
