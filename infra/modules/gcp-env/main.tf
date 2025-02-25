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

# Create a private IP address for AlloyDB
resource "google_compute_global_address" "private_ip_alloydb" {
  name          = "alloy-db-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = module.gcp_network.vpc.network_name
}

# Create a private connection for AlloyDB
resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = module.gcp_network.vpc.network_name
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_alloydb.name]
}

module "river_node" {
  source     = "./river-node"
  depends_on = [module.gcp_apis]

  project_id = var.project_id

  google_service_account = module.gke_main.service_account
  node_config            = var.river_node_config
  private_vpc_connection = google_service_networking_connection.private_vpc_connection
  region                 = var.region
  network                = module.gcp_network.vpc.network_name
  k8s_subnet_cidr        = module.gcp_network.k8s_subnet.ip_cidr_range
}

module "notification_service" {
  source     = "./notification-service"
  depends_on = [module.gcp_apis]

  project_id = var.project_id

  private_vpc_connection = google_service_networking_connection.private_vpc_connection
  google_service_account = module.gke_main.service_account
  region                 = var.region
  network                = module.gcp_network.vpc.network_name
  k8s_subnet_cidr        = module.gcp_network.k8s_subnet.ip_cidr_range
}
