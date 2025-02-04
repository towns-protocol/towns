resource "google_compute_global_address" "main_alb" {
  provider = google-beta

  project = var.project_id

  name = "main-alb-ip"

  address_type = "EXTERNAL"
  ip_version   = "IPV4"
}
