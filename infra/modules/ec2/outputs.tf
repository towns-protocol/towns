output "ec2_instance_id" {
  value = aws_instance.zion-docker-host-instance.id
  sensitive = false
}