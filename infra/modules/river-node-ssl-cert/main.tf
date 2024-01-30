module "global_constants" {
  source = "../global-constants"
}

locals {
  base_name                    = "river-node-ssl-cert"
  lambda_function_service_name = "${local.base_name}-lambda-function"
  lambda_tags = merge(module.global_constants.tags, {
    Service = local.lambda_function_service_name
  })
}

# a secret that contains both the .key and the .crt values
resource "aws_secretsmanager_secret" "river_node_ssl_cert" {
  name = "${local.base_name}-secret-${terraform.workspace}"
  tags = module.global_constants.tags
}

resource "aws_secretsmanager_secret_version" "river_node_ssl_cert" {
  secret_id = aws_secretsmanager_secret.river_node_ssl_cert.id
  secret_string = jsonencode({
    "key" = "DUMMY",
    "crt" = "DUMMY",
  })
}

module "lambda_function" {
  source                = "terraform-aws-modules/lambda/aws"
  version               = "6.4.0"
  function_name         = "${local.lambda_function_service_name}-${terraform.workspace}"
  description           = "Lambda function to manage and renew the river node SSL certificate"
  handler               = "index.handler"
  runtime               = "nodejs18.x"
  architectures         = ["x86_64"]
  publish               = true
  timeout               = 600  #seconds #TODO: how long should this timeout be?
  create_package        = true #TODO: what does this do?
  vpc_subnet_ids        = var.subnet_ids
  attach_network_policy = true

  tags                 = local.lambda_tags
  cloudwatch_logs_tags = local.lambda_tags
  create_role          = true
  attach_policy_json   = true

  environment_variables = {
    RIVER_NODE_SSL_CERT_SECRET_ARN = aws_secretsmanager_secret.river_node_ssl_cert.arn
  }

  source_path = "${path.module}/lambda-function"

  policy_json = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          // TODO: should we allow the lambda to set the secret value?
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:UpdateSecret"
        ],
        Resource = aws_secretsmanager_secret.river_node_ssl_cert.arn
      }
    ]
  })

}

resource "aws_cloudwatch_log_subscription_filter" "log_group_filter" {
  name            = "${local.lambda_function_service_name}-${terraform.workspace}-log-group-filter"
  log_group_name  = module.lambda_function.lambda_cloudwatch_log_group_name
  filter_pattern  = ""
  destination_arn = module.global_constants.datadug_forwarder_stack_lambda.arn
}
