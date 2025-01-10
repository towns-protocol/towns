terraform {
  required_providers {
    google-beta = {
      source  = "hashicorp/google-beta"
      version = ">= 5.45.0"
    }
    google = {
      source  = "hashicorp/google"
      version = ">= 5.45.0"
    }
  }

  backend "gcs" {
    bucket = "river-terraform-state"
  }

  required_version = ">= 1.0.3"
}

locals {
  project_id         = "river-arc-runners"
  k8s_config_context = "gke_river-arc-runners_us-east4-a_gh-runner-k8s"
}

# Configure the Google provider
provider "google" {
  project = local.project_id
  region  = "us-central1"
}

provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = local.k8s_config_context
}

provider "helm" {
  kubernetes {
    config_path    = "~/.kube/config"
    config_context = local.k8s_config_context
  }
}

module "runner-gke" {
  source = "./modules/gh-runner-gke"

  project_id             = local.project_id
  create_network         = true
  cluster_suffix         = "k8s"
  gh_app_id              = "1104256"
  gh_app_installation_id = "59239016"
  gh_app_private_key     = var.gh_app_private_key
  gh_config_url          = "https://github.com/river-build"
  arc_container_mode     = "dind"

  min_node_count = 1
  max_node_count = 100

  # TODO: uncomment
  arc_runners_values = [
    file("${path.module}/values.yaml")
  ]
}
