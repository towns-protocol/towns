output "security_group_id" {
  description = "The id of the security group"
  value       = module.dendrite_alb_sg.security_group_id
}

output "dendrite_server_target_group_arn" {
  description = "The target group arn for the dendrite server"
  value = module.dendrite_alb.target_group_arns[0]
}

output "dendrite_profiler_target_group_arn" {
  description = "The target group arn for the dendrite profiler"
  value = module.dendrite_alb.target_group_arns[1]
}

output "pgadmin_target_group_arn" {
  description = "The target group arn for pgadmin"
  value = module.dendrite_alb.target_group_arns[2]
}