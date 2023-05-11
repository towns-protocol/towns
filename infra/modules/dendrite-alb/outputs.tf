output "security_group_id" {
  description = "The id of the security group"
  value       = module.dendrite_alb_sg.security_group_id
}

output "dendrite_server_blue_target_group_arn" {
  description = "The blue target group arn for the dendrite server"
  value = module.dendrite_alb.target_group_arns[0]
}

output "dendrite_server_green_target_group_arn" {
  description = "The green target group arn for the dendrite server"
  value = module.dendrite_alb.target_group_arns[1]
}

output "dendrite_profiler_target_group_arn" {
  description = "The target group arn for the dendrite profiler"
  value = module.dendrite_alb.target_group_arns[2]
}

output "pgadmin_target_group_arn" {
  description = "The target group arn for pgadmin"
  value = module.dendrite_alb.target_group_arns[3]
}

output "dendrite_https_listener_arn" {
  description = "The arn for the https listener"
  value = module.dendrite_alb.https_listener_arns[1]
}