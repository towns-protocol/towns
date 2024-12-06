module "global_constants" {
  source = "../global-constants"
}

data "aws_vpc" "vpc" {
  id = var.vpc_id
}

locals {
  node_name     = var.node_metadata.node_name
  node_number   = var.node_metadata.node_number
  node_dns_name = var.node_metadata.dns_name
  node_url      = var.node_metadata.url
  run_mode      = var.node_metadata.run_mode
  archive_id    = local.run_mode == "archive" ? var.node_metadata.node_number : ""

  rpc_https_port = 443

  service_name        = "river-node"
  global_remote_state = module.global_constants.global_remote_state.outputs

  shared_credentials = local.global_remote_state.river_node_credentials_secret[local.node_number - 1]

  river_node_tags = merge(
    module.global_constants.tags,
    {
      Service  = local.service_name
      Node_Url = local.node_url
      Run_Mode = local.run_mode
    }
  )

  dd_agent_tags = merge(
    module.global_constants.tags,
    {
      Service  = "dd-agent"
      Node_Url = local.node_url
    }
  )

  dd_required_tags = "env:${terraform.workspace}, node_url:${local.node_url}"

  total_vcpu   = var.cpu
  total_memory = var.memory

  dd_agent_cpu   = 128
  river_node_cpu = local.total_vcpu - local.dd_agent_cpu

  dd_agent_memory   = 256
  river_node_memory = local.total_memory - local.dd_agent_memory

  ephemeral_storage_size_in_gib = 100
}

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
  name = "${local.node_name}-ecsTaskExecutionRole"
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

module "river_internal_sg" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "${local.node_name}_river_internal_sg"
  description = "Security group for river node"
  vpc_id      = var.vpc_id

  ingress_with_cidr_blocks = [
    {
      from_port   = local.rpc_https_port,
      to_port     = local.rpc_https_port,
      protocol    = "tcp",
      description = "Allow incoming TCP traffic from the public internet on port 443 (TCP)",
      cidr_blocks = "0.0.0.0/0"
    },
    {
      from_port   = local.rpc_https_port,
      to_port     = local.rpc_https_port,
      protocol    = "udp",
      description = "Allow incoming UDP traffic from the public internet on port 443 (UDP)",
      cidr_blocks = "0.0.0.0/0"
    }
  ]

  ingress_with_source_security_group_id = [
    {
      from_port                = local.rpc_https_port
      to_port                  = local.rpc_https_port
      protocol                 = "tcp"
      description              = "Allow incoming TCP traffic from the NLB"
      source_security_group_id = var.lb.lb_security_group_id
    },
    {
      from_port                = local.rpc_https_port
      to_port                  = local.rpc_https_port
      protocol                 = "udp"
      description              = "Allow incoming UDP traffic from the NLB"
      source_security_group_id = var.lb.lb_security_group_id
    }
  ]

  egress_cidr_blocks = ["0.0.0.0/0"] # public internet
  egress_rules       = ["all-all"]
}

resource "aws_security_group_rule" "allow_river_node_inbound_to_db" {
  type      = "ingress"
  from_port = 5432
  to_port   = 5432
  protocol  = "tcp"

  security_group_id        = var.river_node_db.rds_aurora_postgresql.security_group_id
  source_security_group_id = module.river_internal_sg.security_group_id
}

resource "aws_security_group_rule" "allow_post_provision_config_lambda_inbound_to_db" {
  type      = "ingress"
  from_port = 5432
  to_port   = 5432
  protocol  = "tcp"

  security_group_id        = var.river_node_db.rds_aurora_postgresql.security_group_id
  source_security_group_id = aws_security_group.post_provision_config_lambda_function_sg.id
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

  node_metadata                           = var.node_metadata
  subnet_ids                              = var.private_subnets
  river_node_wallet_credentials_arn       = var.node_metadata.credentials.wallet_private_key.arn
  river_db_cluster_master_user_secret_arn = var.river_node_db.root_user_secret_arn
  river_user_db_config                    = local.db_config
  rds_cluster_resource_id                 = var.river_node_db.rds_aurora_postgresql.cluster_resource_id
  vpc_id                                  = var.vpc_id
  security_group_id                       = aws_security_group.post_provision_config_lambda_function_sg.id
}

locals {
  function_name = module.post_provision_config.lambda_function.lambda_function_name
}

# Invoking the lambda function one RDS is created to configure the DB
resource "null_resource" "invoke_lambda" {
  triggers = {
    lambda_last_modified = module.post_provision_config.lambda_function.lambda_function_last_modified
  }
  provisioner "local-exec" {
    command = "aws lambda invoke --function-name ${local.function_name} /dev/null"
  }
  depends_on = [var.river_node_db, module.post_provision_config]

  lifecycle {
    ignore_changes = all
  }
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
  count           = local.run_mode == "full" ? 1 : 0
}

resource "aws_iam_role_policy" "river_node_credentials" {
  name = "${local.node_name}-node-credentials"
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
          "${var.node_metadata.credentials.db_password.arn}",
          "${var.node_metadata.credentials.wallet_private_key.arn}",
          "${local.global_remote_state.river_global_dd_agent_api_key.arn}",
          "${local.global_remote_state.river_sepolia_rpc_url_secret.arn}",
          "${local.global_remote_state.river_mainnet_rpc_url_secret.arn}",
          "${local.global_remote_state.base_sepolia_rpc_url_secret.arn}",
          "${local.global_remote_state.base_mainnet_rpc_url_secret.arn}",
          "${var.river_node_ssl_cert_secret_arn}",
          "${var.chainsstring_secret_arn}"
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
  db_user_prefix = local.run_mode == "full" ? "river" : "archive"

  db_config = {
    host         = var.river_node_db.rds_aurora_postgresql.cluster_endpoint
    port         = "5432"
    database     = "river"
    user         = "${local.db_user_prefix}${local.node_number}"
    password_arn = var.node_metadata.credentials.db_password.arn
  }

  // we conditionally create these arrays. an empty array, when concatted, does nothing.
  // this is how we conditionally add secrets and env vars to the task definition.

  base_chain_default_td_secret_config = var.base_chain_rpc_url_plaintext_override == null ? [{
    name      = "BASECHAIN__NETWORKURL"
    valueFrom = var.base_chain_rpc_url_secret_arn
  }] : []

  base_chain_override_td_env_config = var.base_chain_rpc_url_plaintext_override == null ? [] : [{
    name  = "BASECHAIN__NETWORKURL"
    value = var.base_chain_rpc_url_plaintext_override
  }]

  river_chain_default_td_secret_config = var.river_chain_rpc_url_plaintext_override == null ? [{
    name      = "RIVERCHAIN__NETWORKURL"
    valueFrom = var.river_chain_rpc_url_secret_arn
  }] : []

  river_chain_override_td_env_config = var.river_chain_rpc_url_plaintext_override == null ? [] : [{
    name  = "RIVERCHAIN__NETWORKURL"
    value = var.river_chain_rpc_url_plaintext_override
  }]

  archive_mode_additional_td_env_config = local.run_mode == "archive" ? [{
    name  = "ARCHIVE__ARCHIVEID"
    value = local.archive_id
  }] : []

  wallet_private_key_td_secret_config = local.run_mode == "full" ? [
    {
      name      = "WALLETPRIVATEKEY"
      valueFrom = var.node_metadata.credentials.wallet_private_key.arn
  }] : []
}

data "cloudflare_zone" "zone" {
  name = module.global_constants.primary_hosted_zone_name
}

resource "aws_ecs_task_definition" "river-fargate" {
  family = "${local.node_name}-fargate"

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
    name  = "river-node"
    image = "public.ecr.aws/h5v6m2x1/river:${var.docker_image_tag}"

    essential = true
    portMappings = [{
      containerPort = local.rpc_https_port
      hostPort      = local.rpc_https_port
      protocol      = "tcp"
      }, {
      containerPort = 8081
      hostPort      = 8081
      protocol      = "tcp"
      }, {
      containerPort = 8082
      hostPort      = 8082
      protocol      = "tcp"
    }]

    cpu    = local.river_node_cpu
    memory = local.river_node_memory

    secrets = concat([
      {
        name      = "ARCHITECTCONTRACT__ADDRESS"
        valueFrom = var.system_parameters.space_factory_contract_address_parameter.arn
      },
      {
        # WalletLink has been migrated to the Space Factory contract.
        # But XChain still refers to walletLink contract.
        # This is a duplicate of ARCHITECTCONTRACT__ADDRESS, so that XChain can still refer to WalletLink contract.
        name      = "WALLET_LINK_CONTRACT__ADDRESS"
        valueFrom = var.system_parameters.space_factory_contract_address_parameter.arn
      },
      {
        name      = "REGISTRYCONTRACT__ADDRESS",
        valueFrom = var.system_parameters.river_registry_contract_address_parameter.arn
      },
      {
        name      = "ENTITLEMENT_CONTRACT__ADDRESS",
        valueFrom = var.system_parameters.entitlement_checker_contract_address_parameter.arn
      },
      {
        name      = "DATABASE__PASSWORD",
        valueFrom = var.node_metadata.credentials.db_password.arn
      },
      {
        name      = "TLSCONFIG__CERT",
        valueFrom = "${var.river_node_ssl_cert_secret_arn}:cert::"
      },
      {
        name      = "TLSCONFIG__KEY",
        valueFrom = "${var.river_node_ssl_cert_secret_arn}:key::"
      },
      {
        name      = "CHAINSSTRING",
        valueFrom = var.chainsstring_secret_arn
      }
      ],
      local.base_chain_default_td_secret_config,
      local.river_chain_default_td_secret_config,
      local.wallet_private_key_td_secret_config
    )

    environment = concat([
      {
        name  = "RUN_MODE",
        value = local.run_mode
      },
      {
        name  = "ENABLEDEBUGENDPOINTS",
        value = var.enable_debug_endpoints == true ? "true" : "false"
      },
      {
        name  = "BASECHAIN__CHAINID",
        value = var.base_chain_id
      },
      {
        name  = "RIVERCHAIN__CHAINID",
        value = var.river_chain_id
      },
      {
        name  = "SCRUBBINGCONFIG__SCRUBELIGIBLEDURATION",
        value = tostring(var.scrub_duration)
      },
      {
        name  = "DATABASE__MIGRATESTREAMCREATION",
        value = var.migrate_stream_creation ? "true" : "false"
      },
      {
        name  = "METRICS__ENABLED",
        value = "true"
      },
      {
        name  = "PORT",
        value = tostring(local.rpc_https_port)
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
        value = var.log_level
      },
      {
        name  = "LOG__NOCOLOR",
        value = "true"
      },
      {
        name  = "RIVER_DATABASE_ISOLATIONLEVEL",
        value = var.river_database_isolation_level
      },
      {
        # TODO: check with serge if this can be set to false on archive nodes
        # TODO: try again with the new version of the archive node
        name  = "STANDBYONSTART",
        value = local.run_mode == "archive" ? "false" : "true"
      },
      {
        name  = "RIVER_PERFORMANCETRACKING_TRACINGENABLED",
        value = "true"
      },
      {
        name  = "RIVER_PERFORMANCETRACKING_OTLPENABLEGRPC",
        value = "true"
      },
      {
        name  = "RIVER_PERFORMANCETRACKING_OTLPINSECURE",
        value = "true"
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
        name  = "ARCHITECTCONTRACT__VERSION"
        value = "v3"
      },
      {
        name  = "WALLETLINKCONTRACT__VERSION"
        value = "v3"
      },
      ],
      local.base_chain_override_td_env_config,
      local.river_chain_override_td_env_config,
      local.archive_mode_additional_td_env_config
    )

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.river_log_group.name
        "awslogs-region"        = "us-east-1"
        "awslogs-stream-prefix" = local.node_name
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

      environment = [
        {
          name  = "DD_SITE",
          value = "datadoghq.com"
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

resource "aws_ecs_service" "river-ecs-service" {
  name                               = "${local.node_name}-fargate-service"
  cluster                            = var.ecs_cluster.id
  task_definition                    = aws_ecs_task_definition.river-fargate.arn
  desired_count                      = var.on ? 1 : 0
  deployment_minimum_healthy_percent = local.run_mode == "archive" ? 0 : 100
  deployment_maximum_percent         = local.run_mode == "archive" ? 100 : 200

  # do not attempt to create the service before the lambda runs
  depends_on = [
    var.river_node_db,
    module.post_provision_config,
    null_resource.invoke_lambda
  ]

  enable_execute_command = true

  launch_type      = "FARGATE"
  platform_version = "1.4.0"

  lifecycle {
    ignore_changes = [task_definition]
  }

  network_configuration {
    security_groups  = [module.river_internal_sg.security_group_id]
    subnets          = var.private_subnets
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.river_node_target_group.arn
    container_name   = "river-node"
    container_port   = local.rpc_https_port
  }

  # we're saying that a node shall be ready within 5 seconds of booting to accept /health requests.
  # the benefit of a low number is that the target group will transition from "initial" to "healthy" faster.
  # the risk is that the node might not be ready to accept requests, so the target group may mark the node as unhealthy.
  # but we counter this by asking for 2 consecutive unhealthy checks before marking the node as unhealthy.
  # which will take 10 seconds, which we set at taret_group.health_check.interval. and 10 seconds should be ample
  # time for the node to be ready to accept requests.
  health_check_grace_period_seconds = 5

  timeouts {
    create = "60m"
    delete = "60m"
  }
  tags = local.river_node_tags
}

resource "cloudflare_record" "nlb_cname_dns_record" {
  count   = 1
  zone_id = data.cloudflare_zone.zone.id
  name    = local.node_dns_name
  value   = var.lb.lb_dns_name
  type    = "CNAME"
  ttl     = 60
}

// MONITORING //

locals {
  # notifies the "infra - goalie" slack group
  datadog_monitor_slack_channel = "@slack-Here_Not_There_Labs-sre-alerts"
  datadog_monitor_slack_mention = "<!subteam^S064UNJ7YQ2>"
  datadog_monitor_slack_message = "${local.datadog_monitor_slack_channel} {{#is_alert}}${local.datadog_monitor_slack_mention}{{/is_alert}}"

  datadog_monitor_alert_min_duration_minutes = local.run_mode == "archive" ? 8 : 2
}

module "datadog_sythetics_test" {
  source  = "../../modules/datadog/synthetic-test"
  name    = "${local.node_name} - uptime"
  type    = "api"
  subtype = "http"
  enabled = local.run_mode == "archive" ? true : false

  locations = ["aws:us-west-1"]
  tags      = ["created_by:terraform", "env:${terraform.workspace}", "node_url:${local.node_url}"]
  message   = local.datadog_monitor_slack_message
  request_definition = {
    method = "GET"
    url    = "${local.node_url}/status?blockchain=0"
  }
  assertions = [
    {
      type     = "responseTime"
      operator = "lessThan"
      target   = "3000"
    },
    {
      type     = "statusCode"
      operator = "is"
      target   = "200"
    },
    {
      type     = "header"
      property = "content-type"
      operator = "is"
      target   = "application/json"
    }
  ]
  options_list = {
    tick_every = 60
    monitor_options = {
      renotify_interval = 30 #Min
    }
    min_failure_duration = 60 * local.datadog_monitor_alert_min_duration_minutes
    min_location_failed  = 1
  }
}

##################################################################
# Load Balancer Routing
##################################################################

resource "aws_lb_listener" "lb_listener" {
  load_balancer_arn = var.lb.lb_arn
  port              = local.rpc_https_port
  protocol          = "TCP_UDP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.river_node_target_group.arn
  }
}

resource "aws_lb_target_group" "river_node_target_group" {
  name        = "${local.node_name}-tg"
  port        = local.rpc_https_port
  protocol    = "TCP_UDP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  # this starts counting from the moment green is registered with the target group.
  # we set this to 5 minutes.
  deregistration_delay = 300
  # TODO: check if this delay is still useful

  health_check {
    path                = "/status?blockchain=0"
    protocol            = "HTTPS"
    port                = local.rpc_https_port
    interval            = 10
    timeout             = 2
    healthy_threshold   = 2
    unhealthy_threshold = 2
    matcher             = "200"
  }

  tags = module.global_constants.tags
}
