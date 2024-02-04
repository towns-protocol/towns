module "global_constants" {
  source = "../global-constants"
}

locals {
  base_name                    = "river-node-ssl-cert"
  lambda_function_service_name = "${local.base_name}-lambda-function"
  lambda_tags = merge(module.global_constants.tags, {
    Service = local.lambda_function_service_name
  })
  global_remote_state             = module.global_constants.global_remote_state.outputs
  acme_secret_arn                 = local.global_remote_state.river_node_acme_account_secret.arn
  cloudflare_api_token_secret_arn = local.global_remote_state.cloudflare_api_token_secret.arn
}

# a secret that contains both the .key and the .crt values
resource "aws_secretsmanager_secret" "river_node_ssl_cert" {
  name        = "${local.base_name}-secret-cert-${terraform.workspace}"
  tags        = module.global_constants.tags
  description = "SSL certificate for the river node"
}

resource "null_resource" "build_lambda" {
  triggers = {
    build_trigger = "${sha256(file("${path.module}/lambda-function/src/index.ts"))}"
    # time          = "${timestamp()}"
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
  description           = "Lambda function to manage and renew the river node SSL certificate"
  handler               = "index.handler"
  runtime               = "nodejs20.x"
  architectures         = ["x86_64"]
  publish               = true
  timeout               = 600  #seconds #TODO: how long should this timeout be?
  create_package        = true #tells Terraform to package the contents of source_path into a ZIP file before uploading it to AWS Lambda
  vpc_subnet_ids        = var.subnet_ids
  attach_network_policy = true

  tags                 = local.lambda_tags
  cloudwatch_logs_tags = local.lambda_tags
  create_role          = true
  attach_policy_json   = true

  environment_variables = {
    COMMON_NAME                  = var.common_name
    CHALLENGE_DNS_RECORD_FQ_NAME = var.challenge_dns_record_fq_name
    RIVER_NODE_SSL_CERT_ARN      = aws_secretsmanager_secret.river_node_ssl_cert.arn
    RIVER_NODE_ACME_ACCOUNT_ARN  = local.acme_secret_arn
    CLOUDFLARE_API_TOKEN_ARN     = local.cloudflare_api_token_secret_arn
  }

  source_path = "${path.module}/lambda-function/dist"

  policy_json = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:UpdateSecret"
        ],
        Resource = [
          aws_secretsmanager_secret.river_node_ssl_cert.arn,
          local.acme_secret_arn,
          local.cloudflare_api_token_secret_arn
        ]
      },
    ]
  })

}

resource "aws_cloudwatch_log_subscription_filter" "log_group_filter" {
  name            = "${local.lambda_function_service_name}-${terraform.workspace}-log-group-filter"
  log_group_name  = module.lambda_function.lambda_cloudwatch_log_group_name
  filter_pattern  = ""
  destination_arn = module.global_constants.datadug_forwarder_stack_lambda.arn
}
