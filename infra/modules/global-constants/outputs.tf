output "backend_bucket_name" {
  value = "here-not-there-terraform-state" 
  sensitive = false
}

output "backend_state_lock_table_name" {
  value = "here-not-there-terraform-state-lock" 
  sensitive = false 
}

output "primary_hosted_zone_name" {
  value = "towns.com" 
  sensitive = false
}

output "environment" {
  value = terraform.workspace
  sensitive = false
}

locals {
  Environment = "${terraform.workspace == "test" ? "test-beta" : terraform.workspace == "staging" ? "staging-beta" : terraform.workspace}"
  sre_goalie_slack_handle = "<@kerem>"
  sre_slack_channel = "@slack-Here_Not_There_Labs-sre-alerts"
}

output "tags" {
  value = {
    Managed_By  = "Terraform"
    # If workspace is test, say test-beta
    Environment = local.Environment
    Env = local.Environment
    Terraform_Workspace = terraform.workspace
  }
  sensitive = true
}

output "region" {
  value = "us-east-1"
  sensitive = true
}

output "sre_slack_identifier" {
  value = "${local.sre_slack_channel} ${local.sre_goalie_slack_handle}"
  sensitive = false
}
