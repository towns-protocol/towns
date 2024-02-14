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

output "pgadmin_security_group_id" {
  value = module.pgadmin.security_group_id
}

output "notification_vapid_key" {
  value = aws_secretsmanager_secret.notification_vapid_key
}
