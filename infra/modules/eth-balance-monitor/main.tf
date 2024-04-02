module "global_constants" {
  source = "../global-constants"
}

locals {
  base_name                    = "eth-balance-monitor"
  lambda_function_service_name = "${local.base_name}-lambda-function"
  lambda_tags = merge(module.global_constants.tags, {
    Service = local.lambda_function_service_name
  })
  global_remote_state = module.global_constants.global_remote_state.outputs
}

resource "null_resource" "build_lambda" {
  triggers = {
    build_trigger = "${sha256(file("${path.module}/lambda-function/src/index.ts"))}"
  }

  provisioner "local-exec" {
    working_dir = "${path.module}/lambda-function" // Set the correct working directory
    command     = "npm install && npm run build"
  }
}

module "lambda_function" {
  depends_on = [null_resource.build_lambda] // Ensure build completes before Lambda deployment

  source                = "terraform-aws-modules/lambda/aws"
  version               = "7.2.0"
  function_name         = "${local.lambda_function_service_name}-${terraform.workspace}"
  description           = "Lambda function to monitor river node eth balances"
  handler               = "index.handler"
  runtime               = "nodejs20.x"
  architectures         = ["x86_64"]
  publish               = true
  timeout               = 600
  create_package        = true
  vpc_subnet_ids        = var.subnet_ids
  attach_network_policy = true

  tags                 = local.lambda_tags
  cloudwatch_logs_tags = local.lambda_tags
  create_role          = true
  attach_policy_json   = true

  trigger_on_package_timestamp = false

  environment_variables = {
    DATADOG_API_KEY_SECRET_ARN         = local.global_remote_state.river_global_dd_agent_api_key.arn
    DATADOG_APPLICATION_KEY_SECRET_ARN = local.global_remote_state.datadog_application_key_secret.arn
    RIVER_CHAIN_RPC_URL_SECRET_ARN     = local.global_remote_state.river_chain_network_url_secret.arn,
    BASE_CHAIN_RPC_URL_SECRET_ARN      = local.global_remote_state.base_chain_network_url_secret.arn,
    RIVER_REGISTRY_CONTRACT_ADDRESS    = var.river_registry_contract_address,
    ENVIRONMENT                        = terraform.workspace
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
          local.global_remote_state.river_chain_network_url_secret.arn,
          local.global_remote_state.base_chain_network_url_secret.arn
        ]
      },
    ]
  })

}

resource "aws_cloudwatch_event_rule" "schedule" {
  name        = "schedule-${module.lambda_function.lambda_function_name}"
  description = "Schedule for the river node eth balance monitor lambda function"

  # every 10 minutes
  schedule_expression = "rate(10 minutes)"
}

resource "aws_cloudwatch_event_target" "schedule_lambda" {
  rule = aws_cloudwatch_event_rule.schedule.name
  # target_id = "processing_lambda"
  arn = module.lambda_function.lambda_function_arn
}


resource "aws_lambda_permission" "allow_events_bridge_to_run_lambda" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda_function.lambda_function_name
  principal     = "events.amazonaws.com"
}

resource "aws_cloudwatch_log_subscription_filter" "log_group_filter" {
  name            = "${local.lambda_function_service_name}-${terraform.workspace}-log-group-filter"
  log_group_name  = module.lambda_function.lambda_cloudwatch_log_group_name
  filter_pattern  = ""
  destination_arn = module.global_constants.datadug_forwarder_stack_lambda.arn
}
