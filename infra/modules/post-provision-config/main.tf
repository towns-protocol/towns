module "global_constants" {
  source = "../global-constants"
}

locals {
  node_name  = var.node_metadata.node_name
  node_url   = var.node_metadata.url
  run_mode   = var.node_metadata.run_mode
  archive_id = local.run_mode == "archive" ? var.node_metadata.node_number : ""

  name = "post-provision-config-${local.node_name}"

  post_provision_config_lambda_s3_object = module.global_constants.global_remote_state.outputs.post_provision_config_lambda_s3_object
  tags = merge(
    module.global_constants.tags,
    {
      Service  = "post-provision-config-lambda"
      Node_Url = local.node_url
      Run_Mode = local.run_mode
    }
  )
  global_remote_state = module.global_constants.global_remote_state.outputs
}


module "post_provision_config_lambda_function" {
  source                 = "terraform-aws-modules/lambda/aws"
  version                = "7.2.0"
  function_name          = "${local.name}-lambda"
  description            = "Lambda function to configure the infra after provisioning"
  handler                = "dist/index.handler"
  runtime                = "nodejs20.x"
  ephemeral_storage_size = 512
  architectures          = ["x86_64"]
  publish                = true
  timeout                = 300 #seconds
  create_package         = false
  s3_existing_package = {
    bucket     = local.post_provision_config_lambda_s3_object.bucket
    key        = local.post_provision_config_lambda_s3_object.key
    version_id = local.post_provision_config_lambda_s3_object.version_id
  }

  vpc_subnet_ids         = var.subnet_ids
  vpc_security_group_ids = [var.security_group_id]
  attach_network_policy  = true
  tags                   = local.tags
  cloudwatch_logs_tags   = local.tags

  create_role = true

  attach_policy_json = true

  environment_variables = {
    RIVER_USER_DB_CONFIG = jsonencode({
      HOST         = var.river_user_db_config.host
      PORT         = var.river_user_db_config.port
      DATABASE     = var.river_user_db_config.database
      USER         = var.river_user_db_config.user
      PASSWORD_ARN = var.river_user_db_config.password_arn
    })
    RIVER_READ_ONLY_USER_DB_CONFIG = jsonencode({
      HOST         = var.river_user_db_config.host
      PORT         = var.river_user_db_config.port
      DATABASE     = var.river_user_db_config.database
      USER         = "river-readonly"
      PASSWORD_ARN = local.global_remote_state.readonlyuser_db_password_secret.arn
    })
    NOTIFICATION_SERVICE_USER_DB_CONFIG = jsonencode({
      HOST         = var.river_user_db_config.host
      PORT         = var.river_user_db_config.port
      DATABASE     = var.river_user_db_config.database
      USER         = "notification_service"
      PASSWORD_ARN = local.global_remote_state.notification_service_db_password_secret.arn
    })
    RIVER_NODE_WALLET_CREDENTIALS_ARN       = var.river_node_wallet_credentials_arn
    RIVER_DB_CLUSTER_MASTER_USER_SECRET_ARN = var.river_db_cluster_master_user_secret_arn
    RUN_MODE                                = local.run_mode
    ARCHIVE_ID                              = local.archive_id
  }

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
            "${var.river_db_cluster_master_user_secret_arn}"
          ]
        },
        {
          "Action": [
            "secretsmanager:GetSecretValue",
            "secretsmanager:PutSecretValue"
          ],
          "Effect": "Allow",
          "Resource": [
            "${var.river_user_db_config.password_arn}",
            "${local.global_remote_state.readonlyuser_db_password_secret.arn}",
            "${var.river_node_wallet_credentials_arn}",
            "${local.global_remote_state.notification_service_db_password_secret.arn}"
          ]
        }
      ]
    }
  EOT
}


resource "aws_cloudwatch_log_subscription_filter" "log_group_filter" {
  name            = "${local.name}-log-group-filter"
  log_group_name  = module.post_provision_config_lambda_function.lambda_cloudwatch_log_group_name
  filter_pattern  = ""
  destination_arn = module.global_constants.datadug_forwarder_stack_lambda.arn
}
