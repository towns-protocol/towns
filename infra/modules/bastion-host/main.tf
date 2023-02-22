locals {
  availability_zone = "us-east-1a"
}

module "global_constants" {
  source = "../global-constants"
}

module "bastion_sg" { 
  source = "terraform-aws-modules/security-group/aws"

  name        = "${module.global_constants.environment}_bastion_sg"
  description = "Security group for bastion ec2 servers"
  vpc_id      = var.vpc_id

  ingress_with_cidr_blocks = [
    {
      rule        = "ssh-tcp"
      cidr_blocks = "67.245.236.77/32" # hardcoded to Kerem's IP for now
      from_port   = 22
      to_port     = 22
    }
  ]

  egress_cidr_blocks = ["0.0.0.0/0"] # public internet
  egress_rules = ["all-all"]
}

resource "aws_network_interface" "bastion-host-nic" {
  subnet_id = var.subnet_id
  security_groups = [module.bastion_sg.security_group_id]
  tags = merge(module.global_constants.tags, {Name = "${module.global_constants.environment}-bastion-host-nic"})
}

data "aws_ami" "amazon-linux-2-latest" {
 most_recent = true


 filter {
   name   = "owner-alias"
   values = ["amazon"]
 }


 filter {
   name   = "name"
   values = ["amzn2-ami-hvm*"]
 }
}

resource "aws_instance" "bastion-host-instance" {
  instance_type = "t2.micro"

  ami = data.aws_ami.amazon-linux-2-latest.id

  tags = merge(module.global_constants.tags, {Name = "${module.global_constants.environment}-bastion-host-instance"})

  network_interface {
    network_interface_id = aws_network_interface.bastion-host-nic.id
    device_index         = 0
  }

  availability_zone = local.availability_zone

  key_name = "bastion_keypair" # TODO: remove the ssh keys once everything is fully automated

  depends_on = [
    aws_network_interface.bastion-host-nic
  ]
  
  user_data = <<-EOF
    #!/bin/bash

    sudo yum -y update
    sudo yum -y install nfs-utils
    sudo yum y install ec2-instance-connect
    mkdir /home/ec2-user/efs-mount-point 
    mkdir -p /home/ec2-user/public-workspace
    sudo chmod 777 /home/ec2-user/public-workspace

  EOF
}