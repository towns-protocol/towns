output "security_group_id" {
  description = "The id of the security group"
  value       = module.river_alb_sg.security_group_id
}

output "lb_dns_name" {
  description = "DNS Name of the load balancer"
  value       = module.river_alb.lb_dns_name
}

output "lb_https_listener_arn" {
  description = "The arn of the alb https listener"
  value       = aws_lb_listener.https_listener.arn
}
