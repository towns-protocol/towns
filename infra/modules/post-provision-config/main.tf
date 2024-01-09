module "global_constants" {
  source = "../global-constants"
}

locals {
  rpc_proxy_global_access_key_arn        = module.global_constants.transient_global_remote_state.outputs.rpc_proxy_global_access_key.arn
  post_provision_config_lambda_s3_object = module.global_constants.global_remote_state.outputs.post_provision_config_lambda_s3_object
  tags = merge(
    module.global_constants.tags,
    {
      Service     = "post-provision-config-lambda"
      Node_Number = var.river_node_number
      Node_Name   = var.river_node_name
    }
  )
  global_remote_state = module.global_constants.global_remote_state.outputs
}


module "post_provision_config_lambda_function" {
  source                 = "terraform-aws-modules/lambda/aws"
  version                = "6.4.0"
  function_name          = "${var.river_node_name}-post-provision-config"
  description            = "Lambda function to configure the infra after provisioning"
  handler                = "index.handler"
  runtime                = "nodejs18.x"
  ephemeral_storage_size = 512
  architectures          = ["x86_64"]
  publish                = true
  timeout                = 30 #seconds
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
    HOME_CHAIN_ID                           = var.home_chain_id
    RIVER_NODE_WALLET_CREDENTIALS_ARN       = var.river_node_wallet_credentials_arn
    RIVER_DB_CLUSTER_MASTER_USER_SECRET_ARN = var.river_db_cluster_master_user_secret_arn
    RPC_PROXY_GLOBAL_ACCESS_KEY_ARN         = local.rpc_proxy_global_access_key_arn
    HOME_CHAIN_NETWORK_URL_SECRET_ARN       = var.homechain_network_url_secret_arn
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
            "${var.river_db_cluster_master_user_secret_arn}",
            "${local.rpc_proxy_global_access_key_arn}"
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
            "${var.homechain_network_url_secret_arn}",
            "${var.river_node_wallet_credentials_arn}"
          ]
        }
      ]
    }
  EOT
}


resource "aws_cloudwatch_log_subscription_filter" "log_group_filter" {
  name            = "${var.river_node_name}-post-provision-config"
  log_group_name  = module.post_provision_config_lambda_function.lambda_cloudwatch_log_group_name
  filter_pattern  = ""
  destination_arn = module.global_constants.datadug_forwarder_stack_lambda.arn
}
