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
