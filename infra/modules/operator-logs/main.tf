locals {
  bucket_name          = "${terraform.workspace}-${var.bucket_name}"
  iam_policy_name      = "${terraform.workspace}-figment-s3-access"
  lambda_function_name = "${terraform.workspace}-s3-datadog"
  lambda_tags = merge(module.global_constants.tags, {
    Service = local.lambda_function_name
  })
  global_remote_state = module.global_constants.global_remote_state.outputs
}

module "global_constants" {
  source = "../global-constants"
}

module "s3_bucket" {
  source = "terraform-aws-modules/s3-bucket/aws"

  bucket = local.bucket_name
  acl    = "private"
  # Allow deletion of non-empty bucket
  force_destroy = false

  control_object_ownership = true
  object_ownership         = "ObjectWriter"
  tags                     = module.global_constants.tags
}

resource "aws_iam_user" "iam_user" {
  name = var.user_name
  path = "/"
  tags = module.global_constants.tags
}

resource "aws_iam_access_key" "aws_iam_access_key" {
  user = aws_iam_user.iam_user.name
}

data "aws_iam_policy_document" "iam_policy" {
  statement {
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:ListBucketMultipartUploads",
      "s3:DeleteObjectVersion",
      "s3:ListBucketVersions",
      "s3:ListBucket",
      "s3:DeleteObject",
      "s3:GetBucketAcl",
      "s3:GetObject",
      "s3:GetBucketPolicy"
    ]
    resources = [
      "arn:aws:s3:::${module.s3_bucket.s3_bucket_id}/*",
      "arn:aws:s3:::${module.s3_bucket.s3_bucket_id}"
    ]
  }
}

resource "aws_iam_user_policy" "iam_user_policy" {
  name   = local.iam_policy_name
  user   = aws_iam_user.iam_user.name
  policy = data.aws_iam_policy_document.iam_policy.json
}

resource "aws_secretsmanager_secret" "iam_user_secret" {
  name                    = var.user_name
  description             = "IAM Keys details for : ${var.user_name} user"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "iam_user_secret_value" {
  secret_id = aws_secretsmanager_secret.iam_user_secret.id
  secret_string = jsonencode(
    {
      "access_key" : "${aws_iam_access_key.aws_iam_access_key.id}"
      "secret_key" : "${aws_iam_access_key.aws_iam_access_key.secret}"
  })
}
module "lambda_function" {
  source         = "terraform-aws-modules/lambda/aws"
  version        = "7.7.0"
  function_name  = local.lambda_function_name
  description    = "Lambda function for forwarding s3 figment logs to datadog"
  handler        = "index.datadog_forwarder"
  runtime        = "python3.11"
  architectures  = ["x86_64"]
  publish        = true
  timeout        = 600
  create_package = true

  layers = [
    module.lambda_layer_local.lambda_layer_arn
  ]

  attach_network_policy = true

  tags               = local.lambda_tags
  create_role        = true
  attach_policy_json = true

  trigger_on_package_timestamp = false

  memory_size = 8192

  environment_variables = {
    DATADOG_SECRET_NAME = local.global_remote_state.river_global_dd_agent_api_key.arn
    BUCKET_NAME         = "${terraform.workspace}-figment-logs"
    ENVIRONMENT         = terraform.workspace
  }

  source_path = "${path.module}/lambda-function"

  policy_json = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "s3:PutObject",
          "s3:ListBucket",
          "s3:GetBucketAcl",
          "s3:GetObject",
        ],
        Resource = [
          "${module.s3_bucket.s3_bucket_arn}/*",
          "${module.s3_bucket.s3_bucket_arn}"
        ]
      },
      {
        Effect = "Allow",
        Action = [
          "secretsmanager:GetSecretValue",
        ],
        Resource = [
          local.global_remote_state.river_global_dd_agent_api_key.arn
        ]
      }
    ]
  })

}
module "lambda_layer_local" {
  source = "terraform-aws-modules/lambda/aws"

  create_layer = true
  layer_name   = "${local.lambda_function_name}-layer"

  description              = "Lambda layer for s3 operator datadog function"
  compatible_runtimes      = ["python3.11"]
  compatible_architectures = ["x86_64"]
  source_path              = "${path.module}/lambda-function"
}
resource "aws_lambda_permission" "allow_bucket" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda_function.lambda_function_name
  principal     = "s3.amazonaws.com"
  source_arn    = module.s3_bucket.s3_bucket_arn
}
resource "aws_s3_bucket_notification" "bucket_notification" {
  bucket = module.s3_bucket.s3_bucket_id

  lambda_function {
    lambda_function_arn = module.lambda_function.lambda_function_arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "${terraform.workspace}/"
    filter_suffix       = ".log"
  }

  depends_on = [aws_lambda_permission.allow_bucket]
}
