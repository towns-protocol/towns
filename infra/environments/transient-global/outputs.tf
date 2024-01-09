output "vpc" {
  value = module.vpc
}

output "river_alb" {
  value = module.river_alb
}

output "river_ecs_cluster" {
  value = {
    name = aws_ecs_cluster.river_ecs_cluster.name
    id   = aws_ecs_cluster.river_ecs_cluster.id
  }
}

output "rpc_proxy_global_access_key" {
  value = aws_secretsmanager_secret.rpc_proxy_global_access_key
}

output "pgadmin_security_group_id" {
  value = module.pgadmin.security_group_id
}
