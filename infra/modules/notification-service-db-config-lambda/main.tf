module "global_constants" {
  source = "../global-constants"
}

locals {
  service_name  = "notification-service-db-config-lambda"
  function_name = "${local.service_name}-${terraform.workspace}"

  tags = merge(
    module.global_constants.tags,
    {
      Service = local.service_name
    }
  )
  global_remote_state = module.global_constants.global_remote_state.outputs
}

output "function_name" {
  value = local.function_name
}

resource "aws_security_group" "lambda_function_sg" {
  name        = "${local.service_name}_sg"
  description = "Security group for the lambda function to configure the notification service database"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group_rule" "db_access" {
  type      = "ingress"
  from_port = 5432
  to_port   = 5432
  protocol  = "tcp"

  security_group_id        = var.db_cluster.rds_aurora_postgresql.security_group_id
  source_security_group_id = aws_security_group.lambda_function_sg.id
}

resource "null_resource" "build_lambda" {
  triggers = {
    src     = "${sha256(file("${path.module}/lambda-function/src/index.ts"))}"
    package = "${sha256(file("${path.module}/lambda-function/package.json"))}"
    lock    = "${sha256(file("${path.module}/lambda-function/yarn.lock"))}"

  }

  provisioner "local-exec" {
    working_dir = "${path.module}/lambda-function" // Set the correct working directory
    command     = "yarn && yarn build"
  }
}

module "lambda_function" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "7.2.0"

  depends_on            = [null_resource.build_lambda]
  function_name         = local.function_name
  description           = "Lambda function to configure the notification service db after provisioning"
  handler               = "index.handler"
  runtime               = "nodejs20.x"
  architectures         = ["x86_64"]
  publish               = true
  timeout               = 300 #seconds
  create_package        = true
  vpc_subnet_ids        = var.subnet_ids
  attach_network_policy = true

  tags                 = local.tags
  cloudwatch_logs_tags = local.tags
  create_role          = true
  attach_policy_json   = true

  vpc_security_group_ids = [aws_security_group.lambda_function_sg.id]

  environment_variables = {
    RIVER_READ_ONLY_USER_DB_CONFIG = jsonencode({
      HOST         = var.db_cluster.rds_aurora_postgresql.cluster_endpoint
      PORT         = "5432"
      DATABASE     = "river"
      USER         = "river-readonly"
      PASSWORD_ARN = local.global_remote_state.readonlyuser_db_password_secret.arn
    })
    NOTIFICATION_SERVICE_USER_DB_CONFIG = jsonencode({
      HOST         = var.db_cluster.rds_aurora_postgresql.cluster_endpoint
      PORT         = "5432"
      DATABASE     = "river"
      USER         = "notification_service"
      PASSWORD_ARN = local.global_remote_state.notification_service_db_password_secret.arn
    })
    DB_CLUSTER_MASTER_USER_SECRET_ARN = var.db_cluster.root_user_secret_arn
  }

  source_path = "${path.module}/lambda-function/dist"

  policy_json = <<-EOT
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Action": [
            "secretsmanager:GetSecretValue"
          ],
          "Effect": "Allow",
          "Resource": [
            "${var.db_cluster.root_user_secret_arn}"
          ]
        },
        {
          "Action": [
            "secretsmanager:GetSecretValue",
            "secretsmanager:PutSecretValue"
          ],
          "Effect": "Allow",
          "Resource": [
            "${local.global_remote_state.readonlyuser_db_password_secret.arn}",
            "${local.global_remote_state.notification_service_db_password_secret.arn}"
          ]
        }
      ]
    }
  EOT
}

resource "aws_cloudwatch_log_subscription_filter" "log_group_filter" {
  name            = "${local.service_name}-log-group-filter"
  log_group_name  = module.lambda_function.lambda_cloudwatch_log_group_name
  filter_pattern  = ""
  destination_arn = module.global_constants.datadug_forwarder_stack_lambda.arn
}
