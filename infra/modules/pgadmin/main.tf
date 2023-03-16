module global_constants {
  source = "../global-constants"
}

resource "random_password" "pgadmin_password" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "pgadmin_password" {
  name = "${module.global_constants.environment}-pgadmin-password"
  tags = module.global_constants.tags
}

resource "aws_secretsmanager_secret_version" "pgadmin_password" {
  secret_id     = aws_secretsmanager_secret.pgadmin_password.id
  secret_string = random_password.pgadmin_password.result
}

data "aws_iam_role" "ecs_task_execution_role" {
  name = "ecsTaskExecutionRole"
}

# allow ecs_task_execution_role to read the secret but not write it

resource "aws_iam_role_policy" "ecs-to-pgadmin-secret-policy" {
  name = "${module.global_constants.environment}-ecs-to-pgadmin-secret-policy"
  role = data.aws_iam_role.ecs_task_execution_role.id

  policy = <<-EOF
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Action": [
          "secretsmanager:GetSecretValue"
        ],
        "Effect": "Allow",
        "Resource": [
          "${aws_secretsmanager_secret.pgadmin_password.arn}"
        ]
      }
    ]
  }
  EOF
}

resource "aws_cloudwatch_log_group" "log_group" {
  name = "/${module.global_constants.environment}/ecs/pgadmin"
  tags = module.global_constants.tags
}


resource "aws_ecs_task_definition" "pgadmin" {

  family = "${module.global_constants.environment}-pgadmin" 

  network_mode = "awsvpc"

  task_role_arn         = data.aws_iam_role.ecs_task_execution_role.arn
  execution_role_arn    = data.aws_iam_role.ecs_task_execution_role.arn

  cpu                      = 512
  memory                   = 1024

  requires_compatibilities = ["FARGATE"]

  container_definitions = jsonencode([{
    name  = "pgadmin"
    image = "dpage/pgadmin4:latest"
    essential = true
    portMappings = [{
      containerPort = 80
      hostPort = 80
    }]

    environment = [
      {
        name = "PGADMIN_DEFAULT_EMAIL",
        value = "admin@hntlabs.com"
      },
    ]

    secrets = [
      {
        name      = "PGADMIN_DEFAULT_PASSWORD"
        valueFrom = aws_secretsmanager_secret.pgadmin_password.arn
      }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.log_group.name
        "awslogs-region"        = "us-east-1"
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = module.global_constants.tags
  
}

module "pgadmin_internal_sg" { 
  source = "terraform-aws-modules/security-group/aws"

  name        = "${module.global_constants.environment}_pgadmin_internal_sg"
  description = "Security group for pgadmin"
  vpc_id      = var.vpc_id


  # Open for security group id (rule or from_port+to_port+protocol+description)
  ingress_with_source_security_group_id = [
    {
      rule                     = "http-80-tcp"
      source_security_group_id = var.dendrite_alb_security_group_id
    },
  ]

  egress_cidr_blocks = ["0.0.0.0/0"] # public internet
  egress_rules = ["all-all"]

}

resource "aws_ecs_service" "pgadmin-ecs-service" {
  name            = "${module.global_constants.environment}-pgadmin-service"
  cluster         = var.ecs_cluster_id
  task_definition = aws_ecs_task_definition.pgadmin.arn
  desired_count   = 1
  deployment_minimum_healthy_percent = 0 
  deployment_maximum_percent = 200

  launch_type      = "FARGATE"
  platform_version = "LATEST"

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "pgadmin"
    container_port   = 80
  }

  network_configuration {
    security_groups  = [module.pgadmin_internal_sg.security_group_id]
    subnets          = var.subnets
    assign_public_ip = true
  }
}