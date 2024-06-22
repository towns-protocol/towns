locals {
  bucket_name     = "${terraform.workspace}-${var.bucket_name}"
  iam_policy_name = "${terraform.workspace}-figment-s3-access"
}

module "global_constants" {
  source = "../global-constants"
}

module "s3_bucket" {
  source = "terraform-aws-modules/s3-bucket/aws"

  bucket = local.bucket_name
  acl    = "private"
  # Allow deletion of non-empty bucket
  force_destroy = true

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
