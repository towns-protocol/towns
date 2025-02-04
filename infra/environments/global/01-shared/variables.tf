variable "gh_app_private_key" {
  sensitive = true
}

variable "cloudflare_terraform_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}
