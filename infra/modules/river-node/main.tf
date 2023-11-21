module "global_constants" {
  source = "../global-constants"
}

data "aws_vpc" "vpc" {
  id = var.vpc_id
}

locals {
  service_name = "river-node"
  tags = merge(
    module.global_constants.tags,
    {
      Service_Name = local.service_name,
      Node_Name    = var.node_name
      Service      = local.service_name
      Instance     = var.node_name
    }
  )
}

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.13.1"
    }
    datadog = {
      source  = "DataDog/datadog"
      version = "3.32.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }

  required_version = ">= 1.0.3"
}

resource "aws_iam_role" "ecs_task_execution_role" {
  name                = "${var.node_name}-ecsTaskExecutionRole"
  managed_policy_arns = ["arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"]
  assume_role_policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Sid" : "",
        "Effect" : "Allow",
        "Principal" : {
          "Service" : "ecs-tasks.amazonaws.com"
        },
        "Action" : "sts:AssumeRole"
      }
    ]
  })

  tags = module.global_constants.tags
}

module "river_node_db" {
  source = "../../modules/river-node-db"

  database_subnets           = var.database_subnets
  allowed_cidr_blocks        = var.database_allowed_cidr_blocks
  vpc_id                     = var.vpc_id
  river_node_name            = var.node_name
  ecs_task_execution_role_id = aws_iam_role.ecs_task_execution_role.id
}

# Behind the load balancer
module "river_internal_sg" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "${module.global_constants.environment}_river_internal_sg"
  description = "Security group for river nodes"
  vpc_id      = var.vpc_id


  # Open for security group id (rule or from_port+to_port+protocol+description)
  ingress_with_source_security_group_id = [
    {
      rule                     = "http-80-tcp"
      source_security_group_id = var.alb_security_group_id
    },
    {
      protocol                 = "tcp"
      from_port                = 5157
      to_port                  = 5157
      source_security_group_id = var.alb_security_group_id
    },
  ]

  egress_cidr_blocks = ["0.0.0.0/0"] # public internet
  egress_rules       = ["all-all"]
}

resource "aws_cloudwatch_log_group" "river_log_group" {
  name = "/${module.global_constants.environment}/ecs/river/${var.node_name}"

  tags = local.tags
}

resource "aws_cloudwatch_log_group" "dd_agent_log_group" {
  name = "/${module.global_constants.environment}/ecs/dd-agent/${var.node_name}"

  tags = local.tags
}

resource "aws_secretsmanager_secret" "river_node_wallet_credentials" {
  name = "${module.global_constants.environment}-river-${var.node_name}-wallet-credentials"
  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "river_node_wallet_credentials" {
  secret_id     = aws_secretsmanager_secret.river_node_wallet_credentials.id
  secret_string = <<EOF
{
  "walletPathPrivateKey": "DUMMY"
}
EOF
}

resource "aws_iam_role_policy" "ecs-to-wallet-secret-policy" {
  name = "${module.global_constants.environment}-ecs-to-wallet-credentials-policy"
  role = aws_iam_role.ecs_task_execution_role.id

  depends_on = [
    aws_secretsmanager_secret_version.river_node_wallet_credentials
  ]

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
          "${aws_secretsmanager_secret.river_node_wallet_credentials.arn}"
        ]
      }
    ]
  }
  EOF
}

resource "aws_secretsmanager_secret" "river_node_push_notification_auth_token" {
  name = "${module.global_constants.environment}-river-${var.node_name}-push-notification-auth-token"
  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "river_node_push_notification_auth_token" {
  secret_id     = aws_secretsmanager_secret.river_node_push_notification_auth_token.id
  secret_string = "DUMMY"
}

resource "aws_iam_role_policy" "ecs-to-push_notification_auth_token" {
  name = "${module.global_constants.environment}-ecs-to-push-notification-auth-token-policy"
  role = aws_iam_role.ecs_task_execution_role.id

  depends_on = [
    aws_secretsmanager_secret_version.river_node_push_notification_auth_token
  ]

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
          "${aws_secretsmanager_secret.river_node_push_notification_auth_token.arn}"
        ]
      }
    ]
  }
  EOF
}

resource "aws_secretsmanager_secret" "river_node_l1_network_url" {
  name = "${module.global_constants.environment}-river-${var.node_name}-l1-network-url"
  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "river_node_l1_network_url" {
  secret_id     = aws_secretsmanager_secret.river_node_l1_network_url.id
  secret_string = "DUMMY"
}

resource "aws_iam_role_policy" "ecs-to-l1-network-url-secret-policy" {
  name = "${module.global_constants.environment}-ecs-to-l1-network-url-secret-policy"
  role = aws_iam_role.ecs_task_execution_role.id

  depends_on = [
    aws_secretsmanager_secret_version.river_node_l1_network_url
  ]

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
          "${aws_secretsmanager_secret.river_node_l1_network_url.arn}"
        ]
      }
    ]
  }
  EOF
}

resource "aws_secretsmanager_secret" "dd_agent_api_key" {
  name = "${module.global_constants.environment}-datadog-agent-api-key"
  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "dd_agent_api_key" {
  secret_id     = aws_secretsmanager_secret.dd_agent_api_key.id
  secret_string = "DUMMY"
}

resource "aws_iam_role_policy" "dd_agent_api_key" {
  name = "${module.global_constants.environment}-datadog-agent-api-key-policy"
  role = aws_iam_role.ecs_task_execution_role.id

  depends_on = [
    aws_secretsmanager_secret_version.dd_agent_api_key
  ]

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
          "${aws_secretsmanager_secret.dd_agent_api_key.arn}"
        ]
      }
    ]
  }
  EOF
}

data "aws_secretsmanager_secret" "hnt_dockerhub_access_key" {
  name = "hnt_dockerhub_access_key"
}

resource "aws_iam_role_policy" "hnt_dockerhub_access_key" {
  name = "${module.global_constants.environment}-hnt-dockerhub-access-key-policy"
  role = aws_iam_role.ecs_task_execution_role.id

  lifecycle {
    ignore_changes = all
  }

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
          "${data.aws_secretsmanager_secret.hnt_dockerhub_access_key.arn}"
        ]
      }
    ]
  }
  EOF
}

resource "aws_lb_target_group" "blue" {
  name        = "${var.node_name}-blue"
  protocol    = "HTTP"
  port        = 80
  target_type = "ip"
  vpc_id      = var.vpc_id


  health_check {
    path                = "/info"
    interval            = 30
    timeout             = 6
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }

  tags = local.tags
}

resource "aws_lb_target_group" "green" {
  name        = "${var.node_name}-green"
  protocol    = "HTTP"
  port        = 80
  target_type = "ip"
  vpc_id      = var.vpc_id

  health_check {
    path                = "/info"
    interval            = 30
    timeout             = 6
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }

  tags = local.tags
}

resource "aws_lb_listener_rule" "host_rule" {
  listener_arn = var.alb_https_listener_arn
  priority     = 1

  lifecycle {
    ignore_changes = [action]
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.blue.arn
  }

  condition {
    host_header {
      values = ["${var.subdomain_name}.${module.global_constants.primary_hosted_zone_name}"]
    }
  }
}

resource "aws_ecs_task_definition" "river-fargate" {
  family = "${module.global_constants.environment}-river-fargate"

  lifecycle {
    ignore_changes = [container_definitions]
  }

  network_mode = "awsvpc"

  task_role_arn      = aws_iam_role.ecs_task_execution_role.arn
  execution_role_arn = aws_iam_role.ecs_task_execution_role.arn

  cpu    = 2048
  memory = 4096

  requires_compatibilities = ["FARGATE"]

  ipc_mode = null

  pid_mode = null

  container_definitions = jsonencode([{
    name      = "river-node"
    image     = "docker.io/herenotthere/river-node:latest"
    essential = true
    portMappings = [{
      containerPort = 5157
      hostPort      = 5157
      protocol      = "tcp"
    }]

    repositoryCredentials = {
      credentialsParameter = data.aws_secretsmanager_secret.hnt_dockerhub_access_key.arn
    },

    secrets = [
      {
        name      = "DBURL"
        valueFrom = "${module.river_node_db.rds_river_node_credentials_arn}:dbConnectionString::"
      },
      {
        name      = "WALLETPRIVATEKEY"
        valueFrom = "${aws_secretsmanager_secret.river_node_wallet_credentials.arn}:walletPathPrivateKey::"
      },
      {
        name      = "CHAIN__NETWORKURL"
        valueFrom = aws_secretsmanager_secret.river_node_l1_network_url.arn
      },
      {
        name      = "PUSHNOTIFICATION__AUTHTOKEN",
        valueFrom = aws_secretsmanager_secret.river_node_push_notification_auth_token.arn
      },
    ]

    environment = [
      {
        name  = "CHAIN__CHAINID",
        value = var.l1_chain_id
      },
      {
        name  = "METRICS__ENABLED",
        value = "false"
      },
      {
        name  = "STORAGE_TYPE",
        value = "postgres"
      },
      {
        name  = "SKIP_GENKEY",
        value = "true"
      },
      {
        name  = "LOG__FORMAT",
        value = "json"
      },
      {
        name  = "LOG__LEVEL",
        value = "info"
      },
      {
        name  = "LOG__NOCOLOR",
        value = "true"
      },
      {
        name  = "PUSHNOTIFICATION__URL",
        value = var.push_notification_worker_url
      },
      {
        name  = "DD_SERVICE",
        value = local.service_name
      },
      {
        name  = "DD_ENV"
        value = module.global_constants.tags.Env
      },
      {
        name  = "DD_TAGS",
        value = "instance:${var.node_name}"
      },
      {
        name  = "PERFORMANCETRACKING__PROFILINGENABLED",
        value = "true"
      },
      {
        name  = "PERFORMANCETRACKING__TRACINGENABLED",
        value = "true"
      },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.river_log_group.name
        "awslogs-region"        = "us-east-1"
        "awslogs-stream-prefix" = var.node_name
      }
    }
    },
    {
      name      = "dd-agent"
      image     = "docker.io/datadog/agent:7"
      essential = true
      portMappings = [{
        "containerPort" : 8126,
        "hostPort" : 8126,
        "protocol" : "tcp"
      }]

      secrets = [{
        name      = "DD_API_KEY"
        valueFrom = aws_secretsmanager_secret.dd_agent_api_key.arn
      }]

      environment = [
        {
          name  = "DD_SITE",
          value = "datadoghq.com"
        },
        {
          name  = "ECS_FARGATE",
          value = "true"
        },
        {
          name  = "DD_APM_ENABLED",
          value = "true"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.dd_agent_log_group.name
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "dd-agent-${var.node_name}"
        }
      }
  }])

  tags = module.global_constants.tags
}

resource "aws_codedeploy_app" "river-node-code-deploy-app" {
  compute_platform = "ECS"
  name             = "${module.global_constants.environment}-river-${var.node_name}-codedeploy-app"
}

resource "aws_iam_role" "ecs_code_deploy_role" {
  name                = "${module.global_constants.environment}-river-${var.node_name}-ecs-code-deploy-role"
  managed_policy_arns = ["arn:aws:iam::aws:policy/AWSCodeDeployRoleForECS"]


  assume_role_policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Sid" : "",
        "Effect" : "Allow",
        "Principal" : {
          "Service" : "codedeploy.amazonaws.com"
        },
        "Action" : "sts:AssumeRole"
      }
    ]
  })

  tags = module.global_constants.tags
}

resource "aws_ecs_service" "river-ecs-service" {
  name                               = "${module.global_constants.environment}-river-${var.node_name}-fargate-service"
  cluster                            = var.ecs_cluster.id
  task_definition                    = aws_ecs_task_definition.river-fargate.arn
  desired_count                      = 1
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100

  launch_type      = "FARGATE"
  platform_version = "1.4.0"

  deployment_controller {
    type = "CODE_DEPLOY"
  }

  lifecycle {
    ignore_changes = [task_definition, desired_count, load_balancer]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.blue.arn
    container_name   = "river-node"
    container_port   = 5157
  }

  network_configuration {
    security_groups  = [module.river_internal_sg.security_group_id]
    subnets          = var.node_subnets
    assign_public_ip = true
  }

  tags = merge(module.global_constants.tags, {
    Instance = var.node_name
    Service  = "river-node"
  })
}

resource "aws_codedeploy_deployment_group" "codedeploy_deployment_group" {
  app_name               = aws_codedeploy_app.river-node-code-deploy-app.name
  deployment_group_name  = "${module.global_constants.environment}-river-${var.node_name}-codedeploy-deployment-group"
  service_role_arn       = aws_iam_role.ecs_code_deploy_role.arn
  deployment_config_name = "CodeDeployDefault.ECSAllAtOnce"

  depends_on = [aws_ecs_service.river-ecs-service]

  ecs_service {
    cluster_name = var.ecs_cluster.name
    service_name = aws_ecs_service.river-ecs-service.name
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
        name = aws_lb_target_group.blue.name
      }

      target_group {
        name = aws_lb_target_group.green.name
      }

      prod_traffic_route {
        listener_arns = [var.alb_https_listener_arn]
      }
    }
  }
}

### MONITORING

resource "datadog_monitor" "river_node_cpu_monitor" {
  count   = module.global_constants.environment == "test" ? 1 : 0
  name    = "${var.node_name} - CPU Usage"
  type    = "metric alert"
  message = "River Node CPU Usage is high on ${var.node_name} ${module.global_constants.sre_slack_identifier}"
  query   = "avg(last_5m):avg:aws.ecs.service.cpuutilization.maximum{instance:${var.node_name}} > 70"
  monitor_thresholds {
    critical          = 70
    critical_recovery = 30
  }

  notify_no_data    = false
  renotify_interval = 60

  tags = [
    "env:${module.global_constants.tags.Environment}",
    "service:${local.service_name}",
    "instance:${var.node_name}"
  ]
}

resource "datadog_monitor" "river_node_memory_monitor" {
  count   = module.global_constants.environment == "test" ? 1 : 0
  name    = "${var.node_name} - Memory Usage"
  type    = "metric alert"
  message = "River Node Memory Usage is high on ${var.node_name} ${module.global_constants.sre_slack_identifier}"
  query   = "avg(last_5m):avg:aws.ecs.service.memory_utilization.maximum{instance:${var.node_name}} > 70"
  monitor_thresholds {
    critical          = 70
    critical_recovery = 30
  }

  notify_no_data    = false
  renotify_interval = 60

  tags = [
    "env:${module.global_constants.tags.Environment}",
    "service:${local.service_name}",
    "instance:${var.node_name}"
  ]
}

data "cloudflare_zone" "zone" {
  name = module.global_constants.primary_hosted_zone_name
}

resource "cloudflare_record" "alb_dns" {
  zone_id = data.cloudflare_zone.zone.id
  name    = var.subdomain_name
  value   = var.alb_dns_name
  type    = "CNAME"
  ttl     = 60
  lifecycle {
    ignore_changes = all
  }
}
