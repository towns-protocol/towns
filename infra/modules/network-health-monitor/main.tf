module "global_constants" {
  source = "../global-constants"
}

locals {
  base_name                    = "network-health-monitor-${var.extracted_metrics_kind}"
  lambda_function_service_name = "${local.base_name}-lambda-function"
  lambda_tags = merge(module.global_constants.tags, {
    Service = local.lambda_function_service_name
  })
  global_remote_state = module.global_constants.global_remote_state.outputs
  memory_size         = var.extracted_metrics_kind == "usage" ? 2048 : 1024
  schedule_expression = var.extracted_metrics_kind == "usage" ? "rate(1 day)" : "rate(5 minutes)"
}

module "lambda_function" {
  source                = "terraform-aws-modules/lambda/aws"
  version               = "7.2.0"
  function_name         = "${local.lambda_function_service_name}-${terraform.workspace}"
  description           = "Lambda function to monitor on-chain  metrics"
  handler               = "index.handler"
  runtime               = "nodejs20.x"
  architectures         = ["x86_64"]
  publish               = true
  timeout               = 900 // 15 minutes
  create_package        = true
  vpc_subnet_ids        = var.subnet_ids
  attach_network_policy = true

  tags                 = local.lambda_tags
  cloudwatch_logs_tags = local.lambda_tags
  create_role          = true
  attach_policy_json   = true

  trigger_on_package_timestamp = false

  memory_size = local.memory_size

  environment_variables = {
    DATADOG_API_KEY_SECRET_ARN         = local.global_remote_state.river_global_dd_agent_api_key.arn
    DATADOG_APPLICATION_KEY_SECRET_ARN = local.global_remote_state.datadog_application_key_secret.arn
    RIVER_CHAIN_RPC_URL_SECRET_ARN     = var.river_chain_rpc_url_secret_arn,
    BASE_CHAIN_RPC_URL_SECRET_ARN      = var.base_chain_rpc_url_secret_arn,
    ENVIRONMENT                        = terraform.workspace
    EXTRACTED_METRICS_KIND             = var.extracted_metrics_kind
  }

  source_path = "${path.module}/lambda-function/dist"

  policy_json = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "secretsmanager:GetSecretValue",
        ],
        Resource = [
          local.global_remote_state.river_global_dd_agent_api_key.arn,
          local.global_remote_state.datadog_application_key_secret.arn,
          var.river_chain_rpc_url_secret_arn,
          var.base_chain_rpc_url_secret_arn
        ]
      },
    ]
  })

}

resource "aws_cloudwatch_event_rule" "schedule" {
  name        = "schedule-${module.lambda_function.lambda_function_name}"
  description = "Schedule for the river node eth balance monitor lambda function"

  schedule_expression = local.schedule_expression
}

resource "aws_cloudwatch_event_target" "schedule" {
  rule = aws_cloudwatch_event_rule.schedule.name
  arn  = module.lambda_function.lambda_function_arn
}


resource "aws_lambda_permission" "allow_cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda_function.lambda_function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.schedule.arn
}

resource "aws_cloudwatch_log_subscription_filter" "log_group_filter" {
  name            = "${local.lambda_function_service_name}-${terraform.workspace}-log-group-filter"
  log_group_name  = module.lambda_function.lambda_cloudwatch_log_group_name
  filter_pattern  = ""
  destination_arn = module.global_constants.datadug_forwarder_stack_lambda.arn
}
