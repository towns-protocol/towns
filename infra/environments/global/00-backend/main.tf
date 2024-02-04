terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.31.0"
    }
  }
  required_version = ">= 1.0.3"
}

provider "aws" {
  region  = "us-east-1"
  profile = "harmony-github-actions"
}

module "global_constants" {
  source = "../../../modules/global-constants"
}

module "terraform_backend" {
  source                        = "../../../modules/terraform-backend"
  backend_bucket_name           = module.global_constants.backend_bucket_name
  backend_state_lock_table_name = module.global_constants.backend_state_lock_table_name
  environment                   = terraform.workspace == "global" ? "global" : ""
}

