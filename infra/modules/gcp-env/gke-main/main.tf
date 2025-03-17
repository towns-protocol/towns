module "gke" {
  source  = "terraform-google-modules/kubernetes-engine/google"
  version = "35.0.1"

  project_id                  = var.project_id
  name                        = "main-cluster-${terraform.workspace}"
  regional                    = true
  region                      = var.region
  network                     = var.network_name
  subnetwork                  = var.subnetwork_name
  ip_range_pods               = var.secondary_ranges.pods.range_name
  ip_range_services           = var.secondary_ranges.services.range_name
  create_service_account      = true
  enable_cost_allocation      = true
  gcs_fuse_csi_driver         = true
  fleet_project               = var.project_id
  deletion_protection         = false
  stateful_ha                 = true
  remove_default_node_pool    = true
  enable_secret_manager_addon = true

  service_account = google_service_account.main.email

  cluster_autoscaling = {
    enabled             = true
    autoscaling_profile = "OPTIMIZE_UTILIZATION"
    min_cpu_cores       = 4
    max_cpu_cores       = 64
    min_memory_gb       = 8
    max_memory_gb       = 256
    disk_type           = "pd-standard"
    gpu_resources       = []
    auto_repair         = true
    auto_upgrade        = true
  }

  node_pools = [
    {
      name               = "n2-standard-4-pool" # Switch to smaller instances
      machine_type       = "n2-standard-4"
      disk_size_gb       = 100
      disk_type          = "pd-standard"
      min_count          = 1  # Keep at least one node
      max_count          = 10 # Scale up only if necessary
      autoscaling        = true
      initial_node_count = 1
    },
    {
      # high mem (up to 128GB)
      name               = "n2-highmem-16-pool"
      machine_type       = "n2-highmem-16"
      disk_size_gb       = 100
      disk_type          = "pd-standard"
      min_count          = 0
      max_count          = 10
      autoscaling        = true
      initial_node_count = 0
    }
  ]
}

resource "google_service_account" "main" {
  account_id   = "main-service-account"
  display_name = "Main Service Account for GKE"
}

resource "google_project_iam_member" "gsa_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.main.email}"
}

resource "google_project_iam_member" "gsa_kcc_editor" {
  project = var.project_id
  role    = "roles/editor"
  member  = "serviceAccount:${google_service_account.main.email}"
}

resource "google_service_account_iam_binding" "gsa_k8s_binding" {
  service_account_id = google_service_account.main.name
  role               = "roles/iam.workloadIdentityUser"
  members = [
    "serviceAccount:${module.gke.identity_namespace}[external-secrets/main-service-account]",
    "serviceAccount:${module.gke.identity_namespace}[default/main-service-account]"
  ]
}
