locals {
  availability_zone = "us-east-1a"
}

data "aws_iam_role" "ecs_instance_role" {
  name = "ecsInstanceRole"
}

data "aws_iam_instance_profile" "zion-ec2-host-instance-profile" {
  name = "zion-node-ec2-host-instance-profile"
}

module "global_constants" {
  source = "../global-constants"
}

resource "aws_ebs_volume" "zion-ebs-volume" {
  availability_zone = local.availability_zone # TODO: remove all dependencies on external volumes
  size              = 100
  type              = "gp2"
  tags = merge(module.global_constants.tags, { Name = "${module.global_constants.environment}-zion-ebs-volume" })
}

data "aws_ami" "ecs_host_ami" {
  most_recent = true

  filter {
    name   = "name"
    values = ["amzn2-ami-ecs-hvm-2.0.20220831-x86_64-ebs"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_network_interface" "zion-docker-host-nic" {
  subnet_id = var.subnet_id
  security_groups = [var.security_group_id]
  tags = merge(module.global_constants.tags, {Name = "${module.global_constants.environment}-zion-docker-host-nic"})
}

resource "aws_instance" "zion-docker-host-instance" {
  ami           = data.aws_ami.ecs_host_ami.id
  instance_type = "t2.large"

  # TODO: pass node name or instance name as variable (to include the zion node name in the instance name)
  tags = merge(module.global_constants.tags, {Name = "${module.global_constants.environment}-zion-docker-host-instance"})

  network_interface {
    network_interface_id = aws_network_interface.zion-docker-host-nic.id
    device_index         = 0
  }

  iam_instance_profile = data.aws_iam_instance_profile.zion-ec2-host-instance-profile.name

  availability_zone = local.availability_zone

  key_name = "dendrite_monolith" # TODO: remove the ssh keys once everything is fully automated

  user_data = <<-EOF
    #!/bin/bash

    echo "ECS_CLUSTER=${var.ecs_cluster_name}" >> /etc/ecs/ecs.config

    sudo mkfs -t xfs /dev/xvdf
    sudo mkdir /mnt/zion-root
    sudo mount /dev/xvdf /mnt/zion-root
  EOF

  depends_on = [
    aws_network_interface.zion-docker-host-nic,
    data.aws_iam_instance_profile.zion-ec2-host-instance-profile,
    aws_ebs_volume.zion-ebs-volume
  ]
}

resource "aws_volume_attachment" "zion_ec2_ebs_attachment" {
  device_name = "/dev/xvdf"
  volume_id   = aws_ebs_volume.zion-ebs-volume.id
  instance_id = aws_instance.zion-docker-host-instance.id
}

