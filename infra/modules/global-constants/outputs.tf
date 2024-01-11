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

output "nodes_metadata" {
  value = [
    {
      address = "0xbf2fe1d28887a0000a1541291c895a26bd7b1ddd"
      url     = "https://river1-${terraform.workspace}.towns.com"
    }
    , {
      address = "0x43eace8e799497f8206e579f7ccd1ec41770d099"
      url     = "https://river2-${terraform.workspace}.towns.com"
    }
    , {
      address = "0x4e9baef70f7505fda609967870b8b489af294796"
      url     = "https://river3-${terraform.workspace}.towns.com"
    }
    , {
      address = "0xae2ef76c62c199bc49bb38db99b29726bd8a8e53"
      url     = "https://river4-${terraform.workspace}.towns.com"
    }
    , {
      address = "0xc4f042cd5aef82db8c089ad0cc4dd7d26b2684cb"
      url     = "https://river5-${terraform.workspace}.towns.com"
    }
    , {
      address = "0x9bb3b35bbf3fa8030ccdb31030cf78039a0d0d9b"
      url     = "https://river6-${terraform.workspace}.towns.com"
    },
    {
      address = "0x582c64ba11bf70e0bac39988cd3bf0b8f40bdec4"
      url     = "https://river7-${terraform.workspace}.towns.com"
    },
    {
      address = "0x9df6e5f15ec682ca58df6d2a831436973f98fe60"
      url     = "https://river8-${terraform.workspace}.towns.com"
    }
    , {
      address = "0xb79facbfc07bff49cd2e2971305da0df7aca9bf8"
      url     = "https://river9-${terraform.workspace}.towns.com"
    }
    , {
      address = "0xa278267f396a317c5bb583f47f7f2792bc00d3b3"
      url     = "https://river10-${terraform.workspace}.towns.com"
    }

  ]
}
