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

# # resource "google_compute_global_address" "default" {
# #   provider = google-beta
# #   name     = "kerem-test-ip-global"

# #   address_type = "EXTERNAL"
# #   ip_version   = "IPV4"
# # }

# # resource "google_compute_address" "service-load-balancer-ip" {
# #   project = var.project_id
# #   region  = var.region

# #   name = "service-load-balancer-ip"

# #   network_tier = "PREMIUM"
# #   address_type = "EXTERNAL"
# #   ip_version   = "IPV4"
# # }

# module "global_constants" {
#   source = "../../modules/global-constants"
# }

# data "cloudflare_zone" "zone" {
#   name = module.global_constants.primary_hosted_zone_name
# }

# # resource "cloudflare_record" "service-load-balancer-dns" {
# #   zone_id = data.cloudflare_zone.zone.id
# #   name    = "kerem-lb-dns-test"
# #   value   = google_compute_address.service-load-balancer-ip.address
# #   type    = "A"
# #   ttl     = 1
# # }

