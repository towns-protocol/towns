output "file_system_id" {
  value = aws_efs_file_system.dendrite-file-system.id
  sensitive = false
}