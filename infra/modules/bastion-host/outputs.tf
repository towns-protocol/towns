output "bastion_sg_id" {
  value = module.bastion_sg.security_group_id
  sensitive = false
}