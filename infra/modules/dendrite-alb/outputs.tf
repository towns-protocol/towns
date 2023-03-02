output "security_group_id" {
  description = "The id of the security group"
  value       = module.dendrite_alb_sg.security_group_id
}

output "target_group_arns" {
  description = "A list of target group arns"
  value = module.dendrite_alb.target_group_arns
}