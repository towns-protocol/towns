module "global_constants" {
  source = "../global-constants"
}

resource "aws_efs_file_system" "dendrite-file-system" {
  creation_token = "${module.global_constants.environment}-dendrite-file-system"
  encrypted = true
  tags = module.global_constants.tags
}

module "efs_mount_target_security_group" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "${module.global_constants.environment}_efs_mount_target_security_group"
  description = "Security group for efs mount target"
  vpc_id      = var.vpc_id


  ingress_with_source_security_group_id = [
    for sg in var.inbound_security_groups : {
      description = "Allow NFS traffic from sg:${sg}"
      protocol    = "tcp"
      from_port   = 2049
      to_port     = 2049
      source_security_group_id = sg
    }
  ]

  egress_cidr_blocks = [""]
}


resource "aws_efs_backup_policy" "dendrite-file-system-backup-policy" {
  file_system_id = aws_efs_file_system.dendrite-file-system.id

  backup_policy {
    status = "ENABLED"
  }
}

resource "aws_efs_mount_target" "dendrite-mount-target" {
  file_system_id = aws_efs_file_system.dendrite-file-system.id
  subnet_id      = var.subnet_id
  security_groups = [module.efs_mount_target_security_group.security_group_id]
}
