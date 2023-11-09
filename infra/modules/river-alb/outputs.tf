output "security_group_id" {
  description = "The id of the security group"
  value       = module.river_alb_sg.security_group_id
}

output "river_node_blue_target_group" {
  description = "Name and arn of the blue target group"
  value      = {
    arn = module.river_alb.target_group_arns[0]
    name = module.river_alb.target_group_names[0]
  }
}

output "river_node_green_target_group" {
  description = "Name and arn of the green target group"
  value      = {
    arn = module.river_alb.target_group_arns[1]
    name = module.river_alb.target_group_names[1]
  }
}

output "river_https_listener_arn" {
  description = "The arn for the https listener"
  value       = module.river_alb.https_listener_arns[0]
}

output "river_node_lb_dns_name" {
  description = "DNS Name of the load balancer"
  value       = module.river_alb.lb_dns_name
}

