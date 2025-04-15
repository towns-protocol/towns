resource "google_project_service" "iam" {
  project = var.project_id
  service = "iam.googleapis.com"
}

resource "google_project_service" "compute" {
  project = var.project_id
  service = "compute.googleapis.com"
}

resource "google_project_service" "kubernetes" {
  project = var.project_id
  service = "container.googleapis.com"
}

resource "google_project_service" "secrets" {
  project = var.project_id
  service = "secretmanager.googleapis.com"
}

resource "google_project_service" "gke_hub" {
  project = var.project_id
  service = "gkehub.googleapis.com"
}

resource "google_project_service" "cert_manager" {
  project = var.project_id
  service = "certificatemanager.googleapis.com"
}

resource "google_project_service" "krmapihosting" {
  project = var.project_id
  service = "krmapihosting.googleapis.com"
}

resource "google_project_service" "cloudresourcemanager" {
  project = var.project_id
  service = "cloudresourcemanager.googleapis.com"
}

# service networking api
resource "google_project_service" "servicenetworking" {
  project = var.project_id
  service = "servicenetworking.googleapis.com"
}

resource "google_project_service" "cloud_sql_admin" {
  project = var.project_id
  service = "sqladmin.googleapis.com"

  disable_dependent_services = false
}

resource "google_project_service" "alloydb" {
  project = var.project_id
  service = "alloydb.googleapis.com"
}

resource "google_project_service" "cloud_asset_api" {
  project = var.project_id
  service = "cloudasset.googleapis.com"
}
