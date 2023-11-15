locals {
  tags = {
    Managed_By  = "Terraform"
    Environment = var.environment
  }
}

resource "aws_dynamodb_table" "dynamodb-terraform-state-lock" {
  name           = var.backend_state_lock_table_name
  hash_key       = "LockID"
  read_capacity  = 5
  write_capacity = 5

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = local.tags
}

resource "aws_s3_bucket" "terraform-state" {
  bucket = var.backend_bucket_name
  tags   = local.tags
}

resource "aws_s3_bucket_acl" "terraform-state-acl" {
  acl    = "private"
  bucket = aws_s3_bucket.terraform-state.id
}

resource "aws_s3_bucket_versioning" "terraform-state-versioning" {
  bucket = aws_s3_bucket.terraform-state.id
  versioning_configuration {
    status = "Enabled"
  }
}

