output "security_group_id" {
  description = "The id of the security group"
  value       = module.river_alb_sg.security_group_id
}

output "river_node_blue_target_group_arn" {
  description = "The blue target group arn for the river node"
  value       = module.river_alb.target_group_arns[0]
}

output "river_node_green_target_group_arn" {
  description = "The green target group arn for the river node"
  value       = module.river_alb.target_group_arns[1]
}

output "river_https_listener_arn" {
  description = "The arn for the https listener"
  value       = module.river_alb.https_listener_arns[0]
}
