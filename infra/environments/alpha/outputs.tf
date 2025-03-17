output "vpc" {
  value = module.vpc
}

output "river_ecs_cluster" {
  value = {
    name = aws_ecs_cluster.river_ecs_cluster.name
    id   = aws_ecs_cluster.river_ecs_cluster.id
  }
}
