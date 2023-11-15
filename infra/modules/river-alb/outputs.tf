output "security_group_id" {
  description = "The id of the security group"
  value       = module.river_alb_sg.security_group_id
}

output "lb_dns_name" {
  description = "DNS Name of the load balancer"
  value       = module.river_alb.lb_dns_name
}

output "lb_arn" {
  description = "ARN of the load balancer"
  value       = module.river_alb.lb_arn
}
