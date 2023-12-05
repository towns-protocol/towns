module "global_constants" {
  source = "../global-constants"
}

locals {
  rpc_proxy_global_access_key_arn = module.global_constants.transient_global_remote_state.outputs.rpc_proxy_global_access_key.arn
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
  source_path            = "../../modules/post-provision-config/lambda-function"
  vpc_subnet_ids         = var.river_node_subnets
  vpc_security_group_ids = [var.security_group_id]
  attach_network_policy  = true

  tags = module.global_constants.tags

  create_role = true

  attach_policy_json = true

  environment_variables = {
    RIVER_DB_CREDENTIALS_ARN          = var.rds_river_node_credentials_arn
    RIVER_NODE_WALLET_CREDENTIALS_ARN = var.river_node_wallet_credentials_arn
    RPC_PROXY_GLOBAL_ACCESS_KEY_ARN   = local.rpc_proxy_global_access_key_arn
    HOME_CHAIN_NETWORK_URL_SECRET_ARN = var.homechain_network_url_secret_arn
  }


  # TODO: add rds-connect policy
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
            "${var.rds_river_node_credentials_arn}"
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
