variable "bucket_name" {
  description = "s3 bucket name for figment logs"
  type        = string
}

variable "user_name" {
  description = "IAM User"
  type        = string
}

# variable "subnet_ids" {
#   description = "The subnet ids for the lambda"
#   type        = list(string)
# }
