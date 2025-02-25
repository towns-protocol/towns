########### SECRET MANAGER ###########

resource "google_secret_manager_secret" "notification_service" {
  secret_id = "notification-service"
  replication {
    auto {}
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_secret_manager_secret_version" "notification_service" {
  secret = google_secret_manager_secret.notification_service.id
  secret_data = jsonencode({
    "session_token_key"         = null
    "apns_auth_key"             = null
    "webpush_vapid_public_key"  = null
    "webpush_vapid_private_key" = null
  })

  lifecycle {
    ignore_changes = [secret_data]
  }
}

resource "google_secret_manager_secret_iam_member" "notification_service" {
  secret_id = google_secret_manager_secret.notification_service.id
  role      = "roles/secretmanager.secretAccessor"
  member    = var.google_service_account.member
}

########## GCP ALLOY POSTGRES ###########

module "notification_db" {
  source     = "./notification-service-db"
  project_id = var.project_id

  region                 = var.region
  google_service_account = var.google_service_account
  private_vpc_connection = var.private_vpc_connection
  network                = var.network
  k8s_subnet_cidr        = var.k8s_subnet_cidr
}
