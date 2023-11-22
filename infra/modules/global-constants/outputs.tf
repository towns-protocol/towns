output "backend_bucket_name" {
  value     = "here-not-there-terraform-state"
  sensitive = false
}

output "backend_state_lock_table_name" {
  value     = "here-not-there-terraform-state-lock"
  sensitive = false
}

output "primary_hosted_zone_name" {
  value     = "towns.com"
  sensitive = false
}

locals {
  sre_goalie_slack_handle = "<@kerem>"
  sre_slack_channel       = "@slack-Here_Not_There_Labs-sre-alerts"
}

output "tags" {
  value = {
    Managed_By = "Terraform"
    Env        = terraform.workspace
  }
  sensitive = false
}

output "region" {
  value     = "us-east-1"
  sensitive = false
}

output "sre_slack_identifier" {
  value     = "${local.sre_slack_channel} ${local.sre_goalie_slack_handle}"
  sensitive = false
}
