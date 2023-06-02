module global_constants {
  source = "../global-constants"
}

data "aws_acm_certificate" "primary_hosted_zone_cert" {
  domain = module.global_constants.primary_hosted_zone_name
}

data "aws_vpc" "vpc" {
  id = var.vpc_id
}

module "dendrite_node_db" {
  source = "../../modules/node-db"

  database_subnets = var.database_subnets
  allowed_cidr_blocks = var.database_allowed_cidr_blocks
  vpc_id = var.vpc_id
  dendrite_node_name = var.dendrite_node_name
}

# Behind the load balancer
module "dendrite_internal_sg" { 
  source = "terraform-aws-modules/security-group/aws"

  name        = "${module.global_constants.environment}_dendrite_internal_sg"
  description = "Security group for dendrite nodes"
  vpc_id      = var.vpc_id


  # Open for security group id (rule or from_port+to_port+protocol+description)
  ingress_with_source_security_group_id = [
    {
      rule                     = "http-80-tcp"
      source_security_group_id = var.dendrite_alb_security_group_id
    },
    {
      protocol    = "tcp"
      from_port   = 8008
      to_port     = 8008
      source_security_group_id = var.dendrite_alb_security_group_id
    },
    {
      protocol    = "tcp"
      from_port   = 65432
      to_port     = 65432
      source_security_group_id = var.dendrite_alb_security_group_id
    }
    
  ]

  egress_cidr_blocks = ["0.0.0.0/0"] # public internet
  egress_rules = ["all-all"]

}

# Security-group loop back rule to connect to EFS Volume
resource "aws_security_group_rule" "ecs_loopback_rule" {
  type                      = "ingress"
  from_port                 = 0
  to_port                   = 0
  protocol                  = "-1"
  self                      = true
  description               = "Loopback"
  security_group_id         = "${module.dendrite_internal_sg.security_group_id}"
}

module "dendrite_efs" {
  source = "../efs"
  subnets = var.dendrite_node_subnets
  vpc_id = var.vpc_id
  inbound_security_groups = [
    module.dendrite_internal_sg.security_group_id, 
    var.bastion_host_security_group_id
  ] 
}

module "task_definitions" {
  source      = "../task-definitions"
  dendrite_file_system_id = module.dendrite_efs.file_system_id
  dendrite_node_name = var.dendrite_node_name
  dendrite_log_group_name = var.dendrite_log_group_name
  rds_dendrite_node_credentials_arn = module.dendrite_node_db.rds_dendrite_node_credentials_arn
}

resource "aws_ecs_service" "dendrite-ecs-service" {
  name            = "${module.global_constants.environment}-dendrite-${var.dendrite_node_name}-fargate-service"
  cluster         = var.ecs_cluster_id
  task_definition = module.task_definitions.dendrite_fargate_task_definition_arn
  desired_count   = 1
  deployment_minimum_healthy_percent = 0 
  deployment_maximum_percent = 100

  launch_type      = "FARGATE"
  platform_version = "1.4.0"

  deployment_controller {
    type = "CODE_DEPLOY"
  }

  lifecycle {
    ignore_changes = [task_definition, desired_count, load_balancer]
  }

  load_balancer {
    target_group_arn = var.dendrite_server_blue_target_group_arn
    container_name   = "dendrite"
    container_port   = 8008
  }

  network_configuration {
    security_groups  = [module.dendrite_internal_sg.security_group_id]
    subnets          = var.dendrite_node_subnets
    assign_public_ip = true
  }
}

data "aws_alb_target_group" "blue" {
  arn = var.dendrite_server_blue_target_group_arn
}

data "aws_alb_target_group" "green" {
  arn = var.dendrite_server_green_target_group_arn
}


resource "aws_iam_role" "ecs_code_deploy_role" {
  name                = "${module.global_constants.environment}-dendrite-${var.dendrite_node_name}-ecs-code-deploy-role"
  managed_policy_arns = ["arn:aws:iam::aws:policy/AWSCodeDeployRoleForECS"]

  
  assume_role_policy = jsonencode({
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "",
            "Effect": "Allow",
            "Principal": {
                "Service": "codedeploy.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
  })

  tags = module.global_constants.tags
}


resource "aws_codedeploy_app" "dendrite-node-code-deploy-app" {
  compute_platform = "ECS"
  name             = "${module.global_constants.environment}-dendrite-${var.dendrite_node_name}-codedeploy-app"
}

resource "aws_codedeploy_deployment_group" "codedeploy_deployment_group" {
  app_name               = aws_codedeploy_app.dendrite-node-code-deploy-app.name
  deployment_group_name  = "${module.global_constants.environment}-dendrite-${var.dendrite_node_name}-codedeploy-deployment-group"
  service_role_arn       = aws_iam_role.ecs_code_deploy_role.arn
  deployment_config_name = "CodeDeployDefault.ECSAllAtOnce"

  depends_on = [aws_ecs_service.dendrite-ecs-service]

  ecs_service {
    cluster_name = var.ecs_cluster_name
    service_name = aws_ecs_service.dendrite-ecs-service.name
  }

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE"]
  }

  deployment_style {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "BLUE_GREEN"
  }

  blue_green_deployment_config {
    deployment_ready_option {
      action_on_timeout    = "CONTINUE_DEPLOYMENT"
      wait_time_in_minutes = 0
    }

    terminate_blue_instances_on_deployment_success {
      action                           = "TERMINATE"
      termination_wait_time_in_minutes = 0
    }
  }

  load_balancer_info {
    target_group_pair_info {
      target_group {
        name = data.aws_alb_target_group.blue.name
      }

      target_group {
        name = data.aws_alb_target_group.green.name
      }

      prod_traffic_route {
        listener_arns = [var.dendrite_https_listener_arn]
      }
    }
  }
}