output "dendrite_task_definition_arn" {
  value = aws_ecs_task_definition.dendrite.arn
  sensitive = false
}

output "dendrite_fargate_task_definition_arn" {
  value = aws_ecs_task_definition.dendrite-fargate.arn
  sensitive = false
}