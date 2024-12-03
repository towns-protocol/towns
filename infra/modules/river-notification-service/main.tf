terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.13.1"
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

module "global_constants" {
  source = "../global-constants"
}

locals {
  http_port    = 80
  service_name = "river-notification-service"
  local_name   = "river-notification-service-${terraform.workspace}"

  global_remote_state = module.global_constants.global_remote_state.outputs
  dns_name            = local.local_name
  dns_host            = "${local.dns_name}.${module.global_constants.primary_hosted_zone_name}"

  public_url = "http://${local.dns_host}"

  service_tags = merge(
    module.global_constants.tags,
    {
      Service = local.service_name
    }
  )

  dd_agent_tags = merge(
    module.global_constants.tags,
    {
      Service = "dd-agent"
    }
  )

  dd_required_tags = "env:${terraform.workspace}"

  total_vcpu   = var.cpu
  total_memory = var.memory

  dd_agent_cpu = 128
  service_cpu  = local.total_vcpu - local.dd_agent_cpu

  dd_agent_memory = 256
  service_memory  = local.total_memory - local.dd_agent_memory
}

module "service_db" {
  source = "../../modules/notification-service-db-cluster"

  vpc_id                    = var.vpc_id
  database_subnets          = var.db_subnets
  pgadmin_security_group_id = var.pgadmin_security_group_id

  # TODO: remove the prefix workaround post-migration
  name_prefix = "river"
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
  name = "${local.local_name}-ecsTaskExecutionRole"
  managed_policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    var.system_parameters.river_system_parameters_policy.arn
  ]
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
module "internal_sg" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "${local.local_name}_internal_sg"
  description = "Security group for the notification service"
  vpc_id      = var.vpc_id


  # Open for security group id (rule or from_port+to_port+protocol+description)
  ingress_with_source_security_group_id = [
    {
      rule                     = "http-80-tcp"
      source_security_group_id = var.alb_security_group_id
    }
  ]

  egress_cidr_blocks = ["0.0.0.0/0"] # public internet
  egress_rules       = ["all-all"]
}

resource "aws_security_group_rule" "allow_service_inbound_to_db" {
  type      = "ingress"
  from_port = 5432
  to_port   = 5432
  protocol  = "tcp"

  security_group_id        = module.service_db.rds_aurora_postgresql.security_group_id
  source_security_group_id = module.internal_sg.security_group_id
}

module "notification_service_db_config_lambda" {
  source = "../notification-service-db-config-lambda"

  vpc_id     = var.vpc_id
  subnet_ids = var.private_subnets
  db_cluster = module.service_db
}

resource "null_resource" "invoke_lambda" {
  depends_on = [module.notification_service_db_config_lambda]

  provisioner "local-exec" {
    command = "aws lambda invoke --function-name ${module.notification_service_db_config_lambda.function_name} /dev/null"
  }

  lifecycle {
    ignore_changes = all
  }
}

resource "aws_cloudwatch_log_group" "log_group" {
  name = "/ecs/${local.local_name}"

  tags = local.service_tags
}

resource "aws_cloudwatch_log_subscription_filter" "log_group_filter" {
  name            = "${local.local_name}-log-group"
  log_group_name  = aws_cloudwatch_log_group.log_group.name
  filter_pattern  = ""
  destination_arn = module.global_constants.datadug_forwarder_stack_lambda.arn
}

resource "aws_iam_role_policy" "service_iam_policy" {
  name = "${local.local_name}-policy"
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
          "${aws_secretsmanager_secret.notification_vapid_key.arn}",
          "${local.global_remote_state.notification_service_db_password_secret.arn}",
          "${var.apns_auth_key_secret_arn}",
          "${local.global_remote_state.river_global_dd_agent_api_key.arn}",
          "${local.global_remote_state.river_sepolia_rpc_url_secret.arn}",
          "${local.global_remote_state.river_mainnet_rpc_url_secret.arn}",
          "${local.global_remote_state.notification_authentication_session_token_key_secret.arn}"
        ]
      },
      {
        "Action": [
          "ec2:DescribeNetworkInterfaces"
        ],
        "Effect": "Allow",
        "Resource": "*"
      },
      {
        "Action": [
          "ecs:DescribeTasks"
        ],
        "Effect": "Allow",
        "Resource": "*"
      },
      {
        "Effect" : "Allow",
        "Action" : [
          "ssmmessages:CreateControlChannel",
          "ssmmessages:CreateDataChannel",
          "ssmmessages:OpenControlChannel",
          "ssmmessages:OpenDataChannel"
        ],
        "Resource" : "*"
      }
    ]
  }
  EOF
}

locals {
  db_config = {
    host         = module.service_db.rds_aurora_postgresql.cluster_endpoint
    port         = "5432"
    database     = "river"
    user         = "notification_service"
    password_arn = local.global_remote_state.notification_service_db_password_secret.arn
  }
}

resource "aws_secretsmanager_secret" "notification_vapid_key" {
  name        = "${local.local_name}-vapid-key"
  description = "Key-pair for notification service"
}

resource "aws_ecs_task_definition" "task_definition" {
  family = "${local.local_name}-fargate"

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
    name  = "river-notification-service"
    image = "public.ecr.aws/h5v6m2x1/river:${var.docker_image_tag}"

    essential = true
    portMappings = [{
      containerPort = local.http_port
      hostPort      = local.http_port
      protocol      = "tcp"
    }]

    cpu    = local.service_cpu
    memory = local.service_memory

    secrets = [
      {
        name      = "REGISTRYCONTRACT__ADDRESS",
        valueFrom = var.system_parameters.river_registry_contract_address_parameter.arn
      },
      {
        name      = "DATABASE__PASSWORD",
        valueFrom = local.db_config.password_arn
      },
      {
        name      = "RIVERCHAIN__NETWORKURL"
        valueFrom = var.river_chain_rpc_url_secret_arn
      },
      {
        name      = "NOTIFICATIONS__AUTHENTICATION__SESSIONTOKEN__KEY__KEY",
        valueFrom = local.global_remote_state.notification_authentication_session_token_key_secret.arn
      },
      {
        name      = "NOTIFICATIONS__APN__AUTHKEY",
        valueFrom = var.apns_auth_key_secret_arn
      },
      {
        name      = "NOTIFICATIONS__WEBPUSH__VAPID__PUBLICKEY",
        valueFrom = "${aws_secretsmanager_secret.notification_vapid_key.arn}:publicKey::"
      },
      {
        name      = "NOTIFICATIONS__WEBPUSH__VAPID__PRIVATEKEY",
        valueFrom = "${aws_secretsmanager_secret.notification_vapid_key.arn}:privateKey::"
      }
    ]

    environment = [
      {
        name  = "RIVERCHAIN__CHAINID",
        value = var.river_chain_id
      },
      {
        name  = "DISABLEHTTPS",
        value = "true"
      },
      {
        name  = "PORT",
        value = tostring(local.http_port)
      },
      {
        name  = "LOG__FORMAT",
        value = "json"
      },
      {
        name  = "LOG__LEVEL",
        value = var.log_level
      },
      {
        name  = "LOG__NOCOLOR",
        value = "true"
      },
      {
        name  = "RUN_MODE",
        value = "notifications"
      },
      # TODO: how do we enable tracing?
      # {
      #   name  = "RIVER_PERFORMANCETRACKING_TRACINGENABLED",
      #   value = "true"
      # },
      # {
      #   name  = "RIVER_PERFORMANCETRACKING_OTLPENABLEGRPC",
      #   value = "true"
      # },
      # {
      #   name  = "RIVER_PERFORMANCETRACKING_OTLPINSECURE",
      #   value = "true"
      # },
      {
        name  = "DEBUGENDPOINTS__PPROF",
        value = "true"
      },
      {
        name  = "PERFORMANCETRACKING__PROFILINGENABLED"
        value = "true"
      },
      {
        name  = "DD_TAGS",
        value = local.dd_required_tags
      },
      {
        name  = "DATABASE__HOST",
        value = local.db_config.host
      },
      {
        name  = "DATABASE__PORT",
        value = local.db_config.port
      },
      {
        name  = "DATABASE__USER",
        value = local.db_config.user
      },
      {
        name  = "DATABASE__DATABASE",
        value = local.db_config.database
      },
      {
        name  = "DATABASE__EXTRA"
        value = "?sslmode=disable&pool_max_conns=${tostring(var.max_db_connections)}"
      },
      {
        name  = "NOTIFICATIONS__SUBSCRIPTIONEXPIRATIONDURATION",
        value = "2160h"
      },
      {
        name  = "NOTIFICATIONS__AUTHENTICATION__SESSIONTOKEN__KEY__LIFETIME",
        value = "15m"
      },
      {
        name  = "NOTIFICATIONS__AUTHENTICATION__SESSIONTOKEN__KEY__ALGORITHM",
        value = "HS256"
      },
      {
        name  = "NOTIFICATIONS__APN__TEAMID",
        value = "KG4HQQ5Y2X"
      },
      {
        name  = "NOTIFICATIONS__APN__KEYID",
        value = "M4QUBD2Q36"
      },
      {
        name  = "NOTIFICATIONS__APN__APPBUNDLEID",
        value = var.apns_towns_app_identifier
      },
      {
        name  = "NOTIFICATIONS__WEBPUSH__VAPID__SUBJECT",
        value = "support@towns.com"
      }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.log_group.name
        "awslogs-region"        = "us-east-1"
        "awslogs-stream-prefix" = local.service_name
      }
    }
    }
    , {
      name      = "dd-agent"
      image     = "public.ecr.aws/datadog/agent:7"
      essential = true
      portMappings = [{
        "containerPort" : 8126,
        "hostPort" : 8126,
        "protocol" : "tcp"
        }, {
        "containerPort" : 4317,
        "hostPort" : 4317,
        "protocol" : "tcp"
      }]

      cpu    = local.dd_agent_cpu
      memory = local.dd_agent_memory

      secrets = [{
        name      = "DD_API_KEY"
        valueFrom = local.global_remote_state.river_global_dd_agent_api_key.arn
      }]


      dockerLabels = {
        "com.datadoghq.ad.check_names"  = "[\"openmetrics\"]",
        "com.datadoghq.ad.init_configs" = "[{}]",
        "com.datadoghq.ad.instances"    = "[{\"prometheus_url\": \"http://localhost:${local.http_port}/metrics\", \"namespace\": \"river_notification_service\", \"metrics\": [\"*\"]}]"
      }

      environment = [
        {
          name  = "DD_SITE",
          value = "datadoghq.com"
        },
        {
          name  = "DD_APM_ENABLED",
          value = "true"
        },
        {
          name  = "DD_PROFILING_ENABLED",
          value = "true"
        },
        {
          name  = "DD_TAGS",
          value = local.dd_required_tags
        },
        {
          name  = "DD_OTLP_CONFIG_RECEIVER_PROTOCOLS_GRPC_ENDPOINT",
          value = "0.0.0.0:4317"
        }
      ]
  }])

  tags = module.global_constants.tags
}

resource "aws_ecs_service" "ecs-service" {
  name                               = "${local.local_name}-fargate-service"
  cluster                            = var.ecs_cluster.id
  task_definition                    = aws_ecs_task_definition.task_definition.arn
  desired_count                      = 1
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100

  # do not attempt to create the service before the lambda runs
  depends_on = [
    module.service_db,
    module.notification_service_db_config_lambda,
    null_resource.invoke_lambda
  ]

  enable_execute_command = true

  launch_type      = "FARGATE"
  platform_version = "1.4.0"

  lifecycle {
    ignore_changes = [task_definition]
  }

  network_configuration {
    security_groups  = [module.internal_sg.security_group_id]
    subnets          = var.private_subnets
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.grpc_target_group.arn
    container_name   = "river-notification-service"
    container_port   = local.http_port
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.http_target_group.arn
    container_name   = "river-notification-service"
    container_port   = local.http_port
  }

  health_check_grace_period_seconds = 5

  timeouts {
    create = "60m"
    delete = "60m"
  }
  tags = local.service_tags
}


data "cloudflare_zone" "zone" {
  name = module.global_constants.primary_hosted_zone_name
}

resource "cloudflare_record" "dns_record" {
  count   = 1
  zone_id = data.cloudflare_zone.zone.id
  name    = local.dns_name
  value   = var.alb_dns_name
  type    = "CNAME"
  ttl     = 60
}

// MONITORING //

locals {
  # notifies the "infra - goalie" slack group
  datadog_monitor_slack_channel = "@slack-Here_Not_There_Labs-sre-alerts"
  datadog_monitor_slack_mention = "<!subteam^S064UNJ7YQ2>"
  datadog_monitor_slack_message = "${local.datadog_monitor_slack_channel} {{#is_alert}}${local.datadog_monitor_slack_mention}{{/is_alert}}"

  datadog_monitor_alert_min_duration_minutes = 2
  health_check_endpoint                      = "/status?blockchain=0"
}

# TODO: enable after migration
# module "datadog_sythetics_test" {
#   source  = "../../modules/datadog/synthetic-test"
#   name    = "${local.local_name} - uptime"
#   type    = "api"
#   subtype = "http"
#   enabled = true

#   locations = ["aws:us-west-1"]
#   tags      = ["created_by:terraform", "env:${terraform.workspace}"]
#   message   = local.datadog_monitor_slack_message
#   request_definition = {
#     method = "GET"
#     url    = "${local.public_url}${local.health_check_endpoint}"
#   }

#   assertions = [
#     {
#       type     = "responseTime"
#       operator = "lessThan"
#       target   = "3000"
#     },
#     {
#       type     = "statusCode"
#       operator = "is"
#       target   = "200"
#     },
#     {
#       type     = "header"
#       property = "content-type"
#       operator = "is"
#       target   = "application/json"
#     }
#   ]

#   options_list = {
#     tick_every = 60
#     monitor_options = {
#       renotify_interval = 30 #Min
#     }
#     min_failure_duration = 60 * local.datadog_monitor_alert_min_duration_minutes
#     min_location_failed  = 1
#   }
# }

##################################################################
# Load Balancer Routing
##################################################################


resource "aws_lb_target_group" "http_target_group" {
  name        = "notifications-http-${terraform.workspace}"
  protocol    = "HTTP"
  port        = 80
  target_type = "ip"
  vpc_id      = var.vpc_id


  health_check {
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 6
    interval            = 15
    path                = "/status?blockchain=0"
    protocol            = "HTTP"
  }

  tags = module.global_constants.tags
}

resource "aws_lb_listener_rule" "http_rule" {
  listener_arn = var.alb_https_listener_arn
  priority     = 10 // http should be higher priority than grpc

  lifecycle {
    ignore_changes = [action]
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.http_target_group.arn
  }

  condition {
    host_header {
      values = [local.dns_host]
    }
  }

  condition {
    http_request_method {
      values = ["OPTIONS"]
    }
  }
}

resource "aws_lb_target_group" "grpc_target_group" {
  name             = "notifications-grpc-${terraform.workspace}"
  protocol         = "HTTP"
  protocol_version = "GRPC"
  port             = 80
  target_type      = "ip"
  vpc_id           = var.vpc_id


  health_check {
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 6
    interval            = 15
    path                = "/status?blockchain=0"
    protocol            = "HTTP"
    matcher             = "0"
  }

  tags = module.global_constants.tags
}

resource "aws_lb_listener_rule" "grpc_rule" {
  listener_arn = var.alb_https_listener_arn
  priority     = 20 // grpc should be lower priority than http

  lifecycle {
    ignore_changes = [action]
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.grpc_target_group.arn
  }

  condition {
    host_header {
      values = [local.dns_host]
    }
  }
}
