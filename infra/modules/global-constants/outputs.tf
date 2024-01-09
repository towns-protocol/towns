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
  datadog_forwarder_stack_lambda = {
    name = "DatadogIntegration-ForwarderStack-RUFAY0-Forwarder-HzhENFwRgMR6"
  }
}

data "aws_lambda_function" "datadog_forwarder_stack_lambda" {
  function_name = local.datadog_forwarder_stack_lambda.name
}

output "datadug_forwarder_stack_lambda" {
  value     = data.aws_lambda_function.datadog_forwarder_stack_lambda
  sensitive = false
}

data "aws_caller_identity" "current" {}

output "account_id" {
  value     = data.aws_caller_identity.current.account_id
  sensitive = false
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

data "terraform_remote_state" "global_remote_state" {
  backend = "s3"

  config = {
    region  = "us-east-1"
    profile = "harmony-github-actions"
    bucket  = "here-not-there-terraform-state"
    key     = "env:/global/default"
  }
}

output "global_remote_state" {
  value = data.terraform_remote_state.global_remote_state
}

data "terraform_remote_state" "transient_global_remote_state" {
  backend = "s3"

  config = {
    region  = "us-east-1"
    profile = "harmony-github-actions"
    bucket  = "here-not-there-terraform-state"
    key     = "env:/transient-global/default"
  }
}

output "transient_global_remote_state" {
  value = data.terraform_remote_state.transient_global_remote_state
}


# We reserve the first N listener rules for arbitary services such as pgadmin.
# River nodes are allowed to use the rest of the rules.
output "alb_reserved_num_rules" {
  value = 50
}
