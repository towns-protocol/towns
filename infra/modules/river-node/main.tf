module "global_constants" {
  source = "../global-constants"
}

data "aws_vpc" "vpc" {
  id = var.vpc_id
}

locals {
  node_name   = "river${var.node_number}-${terraform.workspace}"
  grpc_record = "river${var.node_number}-grpc-${terraform.workspace}"

  service_name        = "river-node"
  global_remote_state = module.global_constants.global_remote_state.outputs

  shared_credentials = local.global_remote_state.river_node_credentials_secret[var.node_number - 1]

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

  name        = "${local.node_name}_river_internal_sg"
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

  river_node_number                       = var.node_number
  river_node_name                         = local.node_name
  subnet_ids                              = var.node_subnets
  river_node_wallet_credentials_arn       = local.shared_credentials.wallet_private_key.arn
  river_db_cluster_master_user_secret_arn = var.river_node_db.root_user_secret_arn
  river_user_db_config                    = local.river_user_db_config
  rds_cluster_resource_id                 = var.river_node_db.rds_aurora_postgresql.cluster_resource_id
  vpc_id                                  = var.vpc_id
  security_group_id                       = aws_security_group.post_provision_config_lambda_function_sg.id
  base_chain_id                           = var.base_chain_id
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
          "${local.shared_credentials.db_password.arn}",
          "${local.shared_credentials.wallet_private_key.arn}",
          "${local.global_remote_state.river_global_dd_agent_api_key.arn}",
          "${local.global_remote_state.base_chain_network_url_secret.arn}",
          "${local.global_remote_state.river_chain_network_url_secret.arn}",
          "${local.global_remote_state.river_global_push_notification_auth_token.arn}"
        ]
      }
    ]
  }
  EOF
}

resource "aws_iam_role_policy" "ssm_policy" {
  name = "${local.node_name}-ssmPolicy"
  role = aws_iam_role.ecs_task_execution_role.id

  policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
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
  })
}
resource "aws_lb_target_group" "blue" {
  name        = "${local.node_name}-blue"
  protocol    = "HTTP"
  port        = 80
  target_type = "ip"
  vpc_id      = var.vpc_id


  health_check {
    path                = "/info"
    interval            = 15
    timeout             = 6
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }

  tags = local.river_node_tags
}

resource "aws_lb_target_group" "blue-grpc" {
  name             = "${local.node_name}-blue-grpc"
  protocol         = "HTTP"
  protocol_version = "HTTP2"
  port             = 80
  target_type      = "ip"
  vpc_id           = var.vpc_id

  tags = local.river_node_tags

  health_check {
    path                = "/info"
    interval            = 15
    timeout             = 6
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

resource "aws_lb_listener_rule" "http_rule" {
  listener_arn = var.alb_https_listener_arn

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

resource "aws_lb_listener_rule" "grpc_rule" {
  listener_arn = var.alb_https_listener_arn

  lifecycle {
    ignore_changes = [action]
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.blue-grpc.arn
  }

  condition {
    host_header {
      values = ["${local.grpc_record}.${module.global_constants.primary_hosted_zone_name}"]
    }
  }
}

locals {
  river_user_db_config = {
    host         = var.river_node_db.rds_aurora_postgresql.cluster_endpoint
    port         = "5432"
    database     = "river"
    user         = "river${var.node_number}"
    password_arn = local.shared_credentials.db_password.arn
  }

  nodes = module.global_constants.nodes_metadata

  // we conditionally create these arrays. an empty array, when concatted, does nothing.
  // this is how we conditionally add secrets and env vars to the task definition.

  base_chain_default_td_secret_config = var.base_chain_network_url_override == null ? [{
    name      = "BASECHAIN__NETWORKURL"
    valueFrom = local.global_remote_state.base_chain_network_url_secret.arn
  }] : []

  base_chain_override_td_env_config = var.base_chain_network_url_override == null ? [] : [{
    name  = "BASECHAIN__NETWORKURL"
    value = var.base_chain_network_url_override
  }]

  river_chain_default_td_secret_config = var.river_chain_network_url_override == null ? [{
    name      = "RIVERCHAIN__NETWORKURL"
    valueFrom = local.global_remote_state.river_chain_network_url_secret.arn
  }] : []

  river_chain_override_td_env_config = var.river_chain_network_url_override == null ? [] : [{
    name  = "RIVERCHAIN__NETWORKURL"
    value = var.river_chain_network_url_override
  }]

  river_registry_contract_td_env_config = var.is_transient ? [{
    name  = "REGISTRYCONTRACT__ADDRESS",
    value = "0xEd142Ee3F6B445B70f063A30A3F61e5d7855F6Fd"
  }] : []

  node_registry_csv_multinode = "${local.nodes[0].address},${local.nodes[0].url},${local.nodes[1].address},${local.nodes[1].url},${local.nodes[2].address},${local.nodes[2].url},${local.nodes[3].address},${local.nodes[3].url},${local.nodes[4].address},${local.nodes[4].url},${local.nodes[5].address},${local.nodes[5].url},${local.nodes[6].address},${local.nodes[6].url},${local.nodes[7].address},${local.nodes[7].url},${local.nodes[8].address},${local.nodes[8].url},${local.nodes[9].address},${local.nodes[9].url}"
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
    image = "${local.global_remote_state.public_ecr.repository_url_map["river-node"]}:latest"

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

    secrets = concat([
      {
        name      = "DATABASE__PASSWORD",
        valueFrom = local.shared_credentials.db_password.arn
      },
      {
        name      = "WALLETPRIVATEKEY"
        valueFrom = local.shared_credentials.wallet_private_key.arn
      },
      {
        name      = "PUSHNOTIFICATION__AUTHTOKEN",
        valueFrom = local.global_remote_state.river_global_push_notification_auth_token.arn
      }
      ],
      local.base_chain_default_td_secret_config,
      local.river_chain_default_td_secret_config
    )

    dockerLabels = {
      "com.datadoghq.ad.check_names"  = "[\"openmetrics\"]",
      "com.datadoghq.ad.init_configs" = "[{}]",
      "com.datadoghq.ad.instances"    = "[{\"openmetrics_endpoint\": \"http://localhost:8081/metrics\", \"namespace\": \"river_node\", \"metrics\": [\".*\"], \"collect_counters_with_distributions\": true}]"
    }

    environment = concat([
      {
        name  = "BASECHAIN__CHAINID",
        value = var.base_chain_id
      },
      {
        name  = "RIVERCHAIN__CHAINID",
        value = var.river_chain_id
      },
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
        value = var.log_level
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
        value = local.river_user_db_config.host
      },
      {
        name  = "DATABASE__PORT",
        value = local.river_user_db_config.port
      },
      {
        name  = "DATABASE__USER",
        value = local.river_user_db_config.user
      },
      {
        name  = "DATABASE__DATABASE",
        value = local.river_user_db_config.database
      },
      {
        name  = "DATABASE__EXTRA"
        value = "?sslmode=disable&pool_max_conns=1000"
      },
      {
        name  = "TOWNSARCHITECTCONTRACT__ADDRESS"
        value = "0x57E7c90CE73e327c863AD88909C3F73F5543F609"
      },
      {
        name  = "TOWNSARCHITECTCONTRACT__VERSION"
        value = "v3"
      },
      {
        name  = "WALLETLINKCONTRACT__ADDRESS"
        value = "0xC4a2453c36e107C57c149d933435ee0a4031D526"
      },
      {
        name  = "WALLETLINKCONTRACT__VERSION"
        value = "v3"
      },
      {
        name  = "MODE"
        value = var.is_multi_node ? "multi-node" : "single-node"
      },
      {
        # TODO: remove this env var after migrating to the actual ndoe registry smart contract
        name  = "NODEREGISTRYCSV"
        value = var.is_multi_node ? local.node_registry_csv_multinode : ""
      },
      {
        name  = "USEBLOCKCHAINSTREAMREGISTRY",
        value = var.is_multi_node ? "true" : "false"
      },
      ],
      local.base_chain_override_td_env_config,
      local.river_chain_override_td_env_config,
      local.river_registry_contract_td_env_config
    )

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
      image     = "public.ecr.aws/datadog/agent:7"
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

resource "aws_ecs_service" "river-ecs-service" {
  name                               = "${local.node_name}-fargate-service"
  cluster                            = var.ecs_cluster.id
  task_definition                    = aws_ecs_task_definition.river-fargate.arn
  desired_count                      = 1
  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

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
    ignore_changes = [task_definition, desired_count]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.blue.arn
    container_name   = "river-node"
    container_port   = 5157
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.blue-grpc.arn
    container_name   = "river-node"
    container_port   = 5157
  }

  network_configuration {
    security_groups  = [module.river_internal_sg.security_group_id]
    subnets          = var.node_subnets
    assign_public_ip = true
  }

  timeouts {
    create = "60m"
    delete = "60m"
  }
  tags = local.river_node_tags
}

data "cloudflare_zone" "zone" {
  name = module.global_constants.primary_hosted_zone_name
}

resource "cloudflare_record" "http_dns" {
  zone_id = data.cloudflare_zone.zone.id
  name    = local.node_name
  value   = var.alb_dns_name
  type    = "CNAME"
  ttl     = 60
  lifecycle {
    ignore_changes = all
  }
}

resource "cloudflare_record" "grpc_dns" {
  zone_id = data.cloudflare_zone.zone.id
  name    = local.grpc_record
  value   = var.alb_dns_name
  type    = "CNAME"
  ttl     = 60
  lifecycle {
    ignore_changes = all
  }
}
