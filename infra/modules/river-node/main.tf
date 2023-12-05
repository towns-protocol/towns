module "global_constants" {
  source = "../global-constants"
}

data "aws_vpc" "vpc" {
  id = var.vpc_id
}

locals {
  node_name = "river${var.node_number}-${terraform.workspace}"

  service_name        = "river-node"
  global_remote_state = module.global_constants.global_remote_state.outputs

  river_node_tags = merge(
    module.global_constants.tags,
    {
      Service     = local.service_name
      Node_Number = var.node_number
      Node_Name   = local.node_name
    }
  )
  dd_agent_tags = merge(
    module.global_constants.tags,
    {
      Service     = "dd-agent"
      Node_Number = var.node_number
      Node_Name   = local.node_name
    }
  )

  dd_required_tags = "env:${terraform.workspace}, node_name:${local.node_name}, node_number:${var.node_number}"

  total_vcpu   = var.is_transient ? 2048 : 4096
  total_memory = var.is_transient ? 4096 : 30720

  dd_agent_cpu   = local.total_vcpu * 0.25
  river_node_cpu = local.total_vcpu * 0.75

  dd_agent_memory   = 1024
  river_node_memory = local.total_memory - local.dd_agent_memory

  ephemeral_storage_size_in_gib = var.is_transient ? 21 : 100
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

data "terraform_remote_state" "global_remote_state" {
  backend = "s3"

  config = {
    region  = "us-east-1"
    profile = "harmony-github-actions"
    bucket  = "here-not-there-terraform-state"
    key     = "env:/global/default"
  }
}

resource "aws_iam_role" "ecs_task_execution_role" {
  name                = "${local.node_name}-ecsTaskExecutionRole"
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


# Behind the load balancer
module "river_internal_sg" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "${terraform.workspace}_river_internal_sg"
  description = "Security group for river node"
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

module "river_node_db" {
  source = "../../modules/river-node-db"

  river_node_security_group_id                = module.river_internal_sg.security_group_id
  post_provision_config_lambda_function_sg_id = aws_security_group.post_provision_config_lambda_function_sg.id
  database_subnets                            = var.database_subnets
  river_node_subnets                          = var.node_subnets
  vpc_id                                      = var.vpc_id
  river_node_name                             = local.node_name
  ecs_task_execution_role_id                  = aws_iam_role.ecs_task_execution_role.id
  cluster_source_identifier                   = var.database_cluster_source_identifier
  is_transient                                = var.is_transient
}

resource "aws_security_group" "post_provision_config_lambda_function_sg" {
  name        = "${local.node_name}_post_provision_config_lambda_function_sg"
  description = "Security group for the lambda function to configure the infra after provisioning"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

module "post_provision_config" {
  source = "../../modules/post-provision-config"

  river_node_name                   = local.node_name
  river_node_subnets                = var.node_subnets
  river_node_wallet_credentials_arn = aws_secretsmanager_secret.river_node_wallet_credentials.arn
  homechain_network_url_secret_arn  = aws_secretsmanager_secret.river_node_home_chain_network_url.arn
  rds_river_node_credentials_arn    = module.river_node_db.rds_river_node_credentials_arn
  rds_cluster_resource_id           = module.river_node_db.rds_aurora_postgresql.cluster_resource_id
  vpc_id                            = var.vpc_id
  security_group_id                 = aws_security_group.post_provision_config_lambda_function_sg.id
}

locals {
  function_name = module.post_provision_config.lambda_function.lambda_function_name
}

# Invoking the lambda function one RDS is created to configure the DB
resource "null_resource" "invoke_lambda" {
  provisioner "local-exec" {
    command = "aws lambda invoke --function-name ${local.function_name} /dev/null"
  }
  depends_on = [module.river_node_db, module.post_provision_config]
}

resource "aws_cloudwatch_log_group" "river_log_group" {
  name = "/ecs/river/${local.node_name}"

  tags = local.river_node_tags
}

resource "aws_cloudwatch_log_subscription_filter" "river_log_group_filter" {
  name            = "${local.node_name}-river-log-group"
  log_group_name  = aws_cloudwatch_log_group.river_log_group.name
  filter_pattern  = ""
  destination_arn = module.global_constants.datadug_forwarder_stack_lambda.arn
}

resource "aws_cloudwatch_log_group" "dd_agent_log_group" {
  name = "/ecs/dd-agent/${local.node_name}"

  tags = local.dd_agent_tags
}

resource "aws_cloudwatch_log_subscription_filter" "dd_agent_log_group_filter" {
  name            = "${local.node_name}-dd-agent-log-group"
  log_group_name  = aws_cloudwatch_log_group.dd_agent_log_group.name
  filter_pattern  = ""
  destination_arn = module.global_constants.datadug_forwarder_stack_lambda.arn
}

resource "aws_secretsmanager_secret" "river_node_wallet_credentials" {
  name = "${local.node_name}-wallet-key"
  tags = local.river_node_tags
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
  name = "${local.node_name}-wallet-credentials"
  role = aws_iam_role.ecs_task_execution_role.id

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

resource "aws_iam_role_policy" "ecs-to-push_notification_auth_token" {
  name = "${local.node_name}-push-notification-auth-token"
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
          "${local.global_remote_state.river_global_push_notification_auth_token.arn}"
        ]
      }
    ]
  }
  EOF
}

resource "aws_secretsmanager_secret" "river_node_home_chain_network_url" {
  name = "${local.node_name}-homechain-network-url-secret"
  tags = local.river_node_tags
}

resource "aws_secretsmanager_secret_version" "river_node_home_chain_network_url" {
  secret_id     = aws_secretsmanager_secret.river_node_home_chain_network_url.id
  secret_string = "DUMMY"
}

resource "aws_iam_role_policy" "ecs-to-home-chain-network-url-secret-policy" {
  name = "${local.node_name}-home-chain-network-url-secret"
  role = aws_iam_role.ecs_task_execution_role.id

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
          "${aws_secretsmanager_secret.river_node_home_chain_network_url.arn}"
        ]
      }
    ]
  }
  EOF
}

resource "aws_iam_role_policy" "dd_agent_api_key" {
  name = "${local.node_name}-dd-agent-api-key"
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
          "${local.global_remote_state.river_global_dd_agent_api_key.arn}"
        ]
      }
    ]
  }
  EOF
}

resource "aws_iam_role_policy" "hnt_dockerhub_access_key" {
  name = "${local.node_name}-hnt-dockerhub-access-key-policy"
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
          "${local.global_remote_state.hnt_dockerhub_access_key.arn}"
        ]
      }
    ]
  }
  EOF
}

resource "aws_lb_target_group" "blue" {
  name        = "${local.node_name}-blue"
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

  tags = local.river_node_tags
}

resource "aws_lb_target_group" "green" {
  name        = "${local.node_name}-green"
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

  tags = local.river_node_tags
}

resource "aws_lb_listener_rule" "host_rule" {
  listener_arn = var.alb_https_listener_arn

  # set the priority dynamically to avoid conflicts with
  priority = var.is_transient ? var.git_pr_number : 1

  lifecycle {
    ignore_changes = [action]
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.blue.arn
  }

  condition {
    host_header {
      values = ["${local.node_name}.${module.global_constants.primary_hosted_zone_name}"]
    }
  }
}

resource "aws_ecs_task_definition" "river-fargate" {
  family = "${local.node_name}-fargate"

  lifecycle {
    ignore_changes = [container_definitions]
  }

  ephemeral_storage {
    size_in_gib = local.ephemeral_storage_size_in_gib
  }

  network_mode = "awsvpc"

  task_role_arn      = aws_iam_role.ecs_task_execution_role.arn
  execution_role_arn = aws_iam_role.ecs_task_execution_role.arn

  # 4 vCPU
  cpu = local.total_vcpu

  # 30 GB
  memory = local.total_memory

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
      }, {
      containerPort = 8081
      hostPort      = 8081
      protocol      = "tcp"
    }]

    cpu    = local.river_node_cpu
    memory = local.river_node_memory

    repositoryCredentials = {
      credentialsParameter = local.global_remote_state.hnt_dockerhub_access_key.arn
    },

    secrets = [
      {
        // TODO: remove after migration
        name      = "DBURL"
        valueFrom = "${module.river_node_db.rds_river_node_credentials_arn}:dbConnectionString::"
      },
      {
        name      = "DATABASE__PASSWORD",
        valueFrom = "${module.river_node_db.rds_river_node_credentials_arn}:password::"
      },
      {
        name      = "WALLETPRIVATEKEY"
        valueFrom = "${aws_secretsmanager_secret.river_node_wallet_credentials.arn}:walletPathPrivateKey::"
      },
      {
        name      = "BASECHAIN__NETWORKURL"
        valueFrom = aws_secretsmanager_secret.river_node_home_chain_network_url.arn
      },
      {
        name = "CHAIN__NETWORKURL"
        // TODO: remove after migration
        valueFrom = aws_secretsmanager_secret.river_node_home_chain_network_url.arn
      },
      {
        name      = "PUSHNOTIFICATION__AUTHTOKEN",
        valueFrom = local.global_remote_state.river_global_push_notification_auth_token.arn
      },
    ]

    dockerLabels = {
      "com.datadoghq.ad.check_names"  = "[\"openmetrics\"]",
      "com.datadoghq.ad.init_configs" = "[{}]",
      "com.datadoghq.ad.instances"    = "[{\"openmetrics_endpoint\": \"http://localhost:8081/metrics\", \"namespace\": \"river_node\", \"metrics\": [\".*\"], \"collect_counters_with_distributions\": true}]"
    }

    environment = [
      {
        name  = "BASECHAIN__CHAINID",
        value = var.home_chain_id
      },
      {
        // TODO: remove after migration
        name  = "CHAIN__CHAINID",
        value = var.home_chain_id
      },
      // TODO: remove after migration
      {
        name  = "METRICS__ENABLED",
        value = "true"
      },
      {
        name  = "METRICS__PORT",
        value = "8081"
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
        value = terraform.workspace
      },
      {
        name  = "DD_TAGS",
        value = local.dd_required_tags
      },
      {
        name  = "PERFORMANCETRACKING__PROFILINGENABLED",
        value = "true"
      },
      {
        name  = "PERFORMANCETRACKING__TRACINGENABLED",
        value = "true"
      },
      {
        name  = "DATABASE__HOST",
        value = module.river_node_db.rds_aurora_postgresql.cluster_endpoint
      },
      {
        name  = "DATABASE__PORT",
        value = "5432"
      },
      {
        name  = "DATABASE__USER",
        value = "river"
      },
      {
        name  = "DATABASE__DATABASE",
        value = "river"
      },
      {
        name  = "DATABASE__EXTRA"
        value = "?sslmode=disable&pool_max_conns=1000"
      }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.river_log_group.name
        "awslogs-region"        = "us-east-1"
        "awslogs-stream-prefix" = local.node_name
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

      cpu    = local.dd_agent_cpu
      memory = local.dd_agent_memory

      secrets = [{
        name      = "DD_API_KEY"
        valueFrom = local.global_remote_state.river_global_dd_agent_api_key.arn
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
        },
        {
          name  = "DD_PROMETHEUS_SCRAPE_ENABLED",
          value = "true"
        },
        {
          name  = "DD_PROMETHEUS_SCRAPE_CHECKS_ENABLED",
          value = "true"
        },
        {
          name  = "DD_TAGS",
          value = local.dd_required_tags
        },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.dd_agent_log_group.name
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "dd-agent-${local.node_name}"
        }
      }
  }])

  tags = module.global_constants.tags
}

resource "aws_codedeploy_app" "river-node-code-deploy-app" {
  compute_platform = "ECS"
  name             = "${local.node_name}-codedeploy-app"
}

resource "aws_iam_role" "ecs_code_deploy_role" {
  name                = "${local.node_name}-ecs-code-deploy-role"
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
  name                               = "${local.node_name}-fargate-service"
  cluster                            = var.ecs_cluster.id
  task_definition                    = aws_ecs_task_definition.river-fargate.arn
  desired_count                      = 1
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100

  # do not attempt to create the service before the lambda runs
  depends_on = [
    module.river_node_db,
    module.post_provision_config,
    null_resource.invoke_lambda
  ]

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

  tags = local.river_node_tags
}

resource "aws_codedeploy_deployment_group" "codedeploy_deployment_group" {
  app_name               = aws_codedeploy_app.river-node-code-deploy-app.name
  deployment_group_name  = "${local.node_name}-codedeploy-deployment-group"
  service_role_arn       = aws_iam_role.ecs_code_deploy_role.arn
  deployment_config_name = "CodeDeployDefault.ECSAllAtOnce"

  tags = local.river_node_tags

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

# resource "datadog_monitor" "river_node_cpu_monitor" {
#   count   = module.global_constants.environment == "test" ? 1 : 0
#   name    = "${var.node_name} - CPU Usage"
#   type    = "metric alert"
#   message = "River Node CPU Usage is high on ${var.node_name} ${module.global_constants.sre_slack_identifier}"
#   query   = "avg(last_5m):avg:aws.ecs.service.cpuutilization.maximum{instance:${var.node_name}} > 70"
#   monitor_thresholds {
#     critical          = 70
#     critical_recovery = 30
#   }

#   notify_no_data    = false
#   renotify_interval = 60

#   tags = [
#     "env:${module.global_constants.tags.Environment}",
#     "service:${local.service_name}",
#     "instance:${var.node_name}"
#   ]
# }

# resource "datadog_monitor" "river_node_memory_monitor" {
#   count   = module.global_constants.environment == "test" ? 1 : 0
#   name    = "${var.node_name} - Memory Usage"
#   type    = "metric alert"
#   message = "River Node Memory Usage is high on ${var.node_name} ${module.global_constants.sre_slack_identifier}"
#   query   = "avg(last_5m):avg:aws.ecs.service.memory_utilization.maximum{instance:${var.node_name}} > 70"
#   monitor_thresholds {
#     critical          = 70
#     critical_recovery = 30
#   }

#   notify_no_data    = false
#   renotify_interval = 60

#   tags = [
#     "env:${module.global_constants.tags.Environment}",
#     "service:${local.service_name}",
#     "instance:${var.node_name}"
#   ]
# }

data "cloudflare_zone" "zone" {
  name = module.global_constants.primary_hosted_zone_name
}

resource "cloudflare_record" "alb_dns" {
  zone_id = data.cloudflare_zone.zone.id
  name    = local.node_name
  value   = var.alb_dns_name
  type    = "CNAME"
  ttl     = 60
  lifecycle {
    ignore_changes = all
  }
}
