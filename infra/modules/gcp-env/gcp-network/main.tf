locals {
  k8s_subnet_name = "main-k8s-subnet"
  k8s_subnet      = module.vpc.subnets["${var.region}/${local.k8s_subnet_name}"]
  k8s_subnet_cidr = "10.1.0.0/16"

  k8s_subnet_secondary_ranges = {
    pods = {
      range_name    = "main-k8s-pods"
      ip_cidr_range = "10.2.0.0/16"
    }
    services = {
      range_name    = "main-k8s-services"
      ip_cidr_range = "10.3.0.0/16"
    }
  }
}

module "vpc" {
  source  = "terraform-google-modules/network/google"
  version = "9.3.0"

  project_id   = var.project_id
  network_name = "vpc-main"
  routing_mode = "REGIONAL"

  delete_default_internet_gateway_routes = false
  auto_create_subnetworks                = false

  subnets = [
    {
      subnet_name           = local.k8s_subnet_name
      subnet_ip             = local.k8s_subnet_cidr
      subnet_region         = var.region
      subnet_private_access = true
    }
  ]

  secondary_ranges = {
    "${local.k8s_subnet_name}" = [
      local.k8s_subnet_secondary_ranges.pods,
      local.k8s_subnet_secondary_ranges.services
    ]
  }
}
