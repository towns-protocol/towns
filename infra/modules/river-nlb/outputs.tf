output "security_group_id" {
  description = "The id of the security group"
  value       = module.river_nlb_sg.security_group_id
}

output "river_node_blue_target_group_arn" {
  description = "The blue target group arn for the river node"
  value       = module.river_nlb.target_groups.blue.arn
}

output "river_node_green_target_group_arn" {
  description = "The green target group arn for the river node"
  value       = module.river_nlb.target_groups.green.arn
}

output "river_tls_listener_arn" {
  description = "The arn for the tls listener"
  value       = module.river_nlb.listeners.tls.arn
}
