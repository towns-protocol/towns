variable "alias_domain_name" {
  description = "The domain name to be used by the cloudfront distribution"
  type        = string
}

variable "origin_domain_name" {
  description = "The domain name of the origin to be used by the cloudfront distribution"
  type        = string
}

variable "origin_shield_enabled" {
  description = "Whether or not to enable origin shield"
  type        = bool
}
