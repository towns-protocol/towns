output "lb_arn" {
  value = module.nlb.arn
}

output "lb_security_group_id" {
  value = aws_security_group.nlb_security_group.id
}

output "lb_dns_name" {
  value = module.nlb.dns_name
}
