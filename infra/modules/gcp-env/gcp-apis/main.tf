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
