output "postgres_task_definition_arn" {
  value = aws_ecs_task_definition.postgres.arn
  sensitive = false
}

output "dendrite_task_definition_arn" {
  value = aws_ecs_task_definition.dendrite.arn
  sensitive = false
}