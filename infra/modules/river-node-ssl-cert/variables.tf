variable "subnet_ids" {
  description = "The subnet ids for the lambda"
  type        = list(string)
}

variable "common_name" {
  description = "The common name for the SSL certificate"
  type        = string
}

variable "challenge_dns_record_fq_name" {
  description = "The fully qualified name of the DNS record to be created for the challenge"
  type        = string
}
