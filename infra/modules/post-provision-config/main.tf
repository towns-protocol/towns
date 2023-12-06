module "global_constants" {
  source = "../global-constants"
}

locals {
  rpc_proxy_global_access_key_arn        = module.global_constants.transient_global_remote_state.outputs.rpc_proxy_global_access_key.arn
  post_provision_config_lambda_s3_object = module.global_constants.global_remote_state.outputs.post_provision_config_lambda_s3_object
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

  vpc_subnet_ids         = var.river_node_subnets
  vpc_security_group_ids = [var.security_group_id]
  attach_network_policy  = true

  tags = module.global_constants.tags

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
    RIVER_NODE_WALLET_CREDENTIALS_ARN = var.river_node_wallet_credentials_arn
    RPC_PROXY_GLOBAL_ACCESS_KEY_ARN   = local.rpc_proxy_global_access_key_arn
    HOME_CHAIN_NETWORK_URL_SECRET_ARN = var.homechain_network_url_secret_arn
  }


  policy_json = <<-EOT
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Action": [
            "secretsmanager:GetSecretValue",
            "secretsmanager:PutSecretValue"
          ],
          "Effect": "Allow",
          "Resource": [
            "${var.river_user_db_config.password_arn}"
          ]
        },
        {
          "Action": [
            "secretsmanager:GetSecretValue",
            "secretsmanager:PutSecretValue"
          ],
          "Effect": "Allow",
          "Resource": [
            "${var.homechain_network_url_secret_arn}"
          ]
        },
        {
          "Action": [
            "secretsmanager:GetSecretValue",
            "secretsmanager:PutSecretValue"
          ],
          "Effect": "Allow",
          "Resource": [
            "${var.river_node_wallet_credentials_arn}"
          ]
        },
        {
          "Action": [
            "secretsmanager:GetSecretValue"
          ],
          "Effect": "Allow",
          "Resource": [
            "${local.rpc_proxy_global_access_key_arn}"
          ]
        },
        {
          "Action": [
            "rds-db:connect"
          ],
          "Effect": "Allow",
          "Resource": [
            "arn:aws:rds-db:us-east-1:${module.global_constants.account_id}:dbuser:${var.rds_cluster_resource_id}/*"
          ]
        }
      ]
    }
  EOT
}
