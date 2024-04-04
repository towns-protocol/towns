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

locals {
  num_nodes = 11

  is_transient = length(regexall("transient-\\d+", terraform.workspace)) > 0

  regular_river_node_urls = [
    for i in range(0, local.num_nodes) : "https://river${i + 1}.nodes.${terraform.workspace}.towns.com"
  ]

  # take local.transient_env_name, and parse out the number after splitting on '-'
  transient_no = local.is_transient ? (tonumber(split("-", terraform.workspace)[1])) : 0

  transient_river_node_urls = [
    for i in range(0, local.num_nodes) : "https://river${i + 1}-${local.transient_no}.nodes.transient.towns.com"
  ]

  river_node_urls = local.is_transient ? local.transient_river_node_urls : local.regular_river_node_urls
}

output "nodes_metadata" {
  value = [
    {
      address = "0xBF2Fe1D28887A0000A1541291c895a26bD7B1DdD"
      url     = local.river_node_urls[0]
    }
    , {
      address = "0x43EaCe8E799497f8206E579f7CCd1EC41770d099"
      url     = local.river_node_urls[1]
    }
    , {
      address = "0x4E9baef70f7505fda609967870b8b489AF294796"
      url     = local.river_node_urls[2]
    }
    , {
      address = "0xae2Ef76C62C199BC49bB38DB99B29726bD8A8e53"
      url     = local.river_node_urls[3]
    }
    , {
      address = "0xC4f042CD5aeF82DB8C089AD0CC4DD7d26B2684cB"
      url     = local.river_node_urls[4]
    }
    , {
      address = "0x9BB3b35BBF3FA8030cCdb31030CF78039A0d0D9b"
      url     = local.river_node_urls[5]
    },
    {
      address = "0x582c64BA11bf70E0BaC39988Cd3Bf0b8f40BDEc4"
      url     = local.river_node_urls[6]
    },
    {
      address = "0x9df6e5F15ec682ca58Df6d2a831436973f98fe60"
      url     = local.river_node_urls[7]
    }
    , {
      address = "0xB79FaCbFC07Bff49cD2e2971305Da0DF7aCa9bF8"
      url     = local.river_node_urls[8]
    }
    , {
      address = "0xA278267f396a317c5Bb583f47F7f2792Bc00D3b3"
      url     = local.river_node_urls[9]
      }, {
      address = "0x75b5eb02d2fe5e2f0008a05849d81526963886c2",
      url     = local.river_node_urls[10]
    }
  ]
}
