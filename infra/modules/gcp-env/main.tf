provider "google-beta" {
  project     = var.project_id
  credentials = var.gcloud_credentials
}

provider "google" {
  project     = var.project_id
  credentials = var.gcloud_credentials
}

terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }

  required_version = ">= 1.0.3"
}

module "gcp_apis" {
  source = "./gcp-apis"

  project_id = var.project_id
}

module "gcp_network" {
  source = "./gcp-network"

  depends_on = [module.gcp_apis]
  project_id = var.project_id
  region     = var.region
}

module "main_alb" {
  source = "./main-alb"

  depends_on = [module.gcp_apis]

  project_id = var.project_id
  region     = var.region
}

# TODO: find a way to reduce the min node per zone to 0
module "gke_main" {
  source = "./gke-main"

  depends_on = [module.gcp_apis]

  project_id = var.project_id
  region     = var.region

  zones            = var.zones
  network_name     = module.gcp_network.vpc.network_name
  subnetwork_name  = module.gcp_network.k8s_subnet.name
  secondary_ranges = module.gcp_network.k8s_subnet_secondary_ranges
}

module "gcp_secrets" {
  source = "./gcp-secrets"

  depends_on = [module.gcp_apis]

  google_service_account = module.gke_main.service_account
}

module "river_node" {
  source = "./river-node"

  depends_on = [module.gcp_apis]

  project_id             = var.project_id
  google_service_account = module.gke_main.service_account
  node_config            = var.river_node_config

  region = var.region
}

module "notification_service" {
  source     = "./notification-service"
  depends_on = [module.gcp_apis]

  project_id = var.project_id

  google_service_account = module.gke_main.service_account
}
