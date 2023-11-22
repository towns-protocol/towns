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

output "river_node_1" {
  value = module.river_node_1
}
