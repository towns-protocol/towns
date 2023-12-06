variable "river_node_name" {
  description = "The name of the river node"
  type        = string
  validation {
    condition     = var.river_node_name != ""
    error_message = "The node name cannot be empty."
  }
}

variable "vpc_id" {
  description = "The vpc id"
  type        = string
  validation {
    condition     = var.vpc_id != ""
    error_message = "The vpc id cannot be empty."
  }
}

variable "river_node_subnets" {
  description = "The subnet ids of the river node"
  type        = list(string)
}

variable "river_user_db_config" {
  description = "The granular connection fields to the river db"
  type = object({
    host         = string
    port         = number
    database     = string
    user         = string
    password_arn = string
  })
  validation {
    condition     = var.river_user_db_config != null
    error_message = "The river db connection cannot be null."
  }
}

variable "river_node_wallet_credentials_arn" {
  description = "The arn of the river node wallet credentials"
  type        = string
  validation {
    condition     = var.river_node_wallet_credentials_arn != ""
    error_message = "The river node wallet credentials arn cannot be empty."
  }
}

variable "homechain_network_url_secret_arn" {
  description = "The arn of the homechain network url secret"
  type        = string
  validation {
    condition     = var.homechain_network_url_secret_arn != ""
    error_message = "The homechain network url secret arn cannot be empty."
  }
}

variable "rds_cluster_resource_id" {
  description = "The d of the rds db"
  type        = string
  validation {
    condition     = var.rds_cluster_resource_id != ""
    error_message = "The rds db id cannot be empty."
  }
}

variable "security_group_id" {
  description = "The security group id of the post provision config lambda function"
  type        = string

  validation {
    condition     = var.security_group_id != ""
    error_message = "The security group id cannot be empty."
  }
}
