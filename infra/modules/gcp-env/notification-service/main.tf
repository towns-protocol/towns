########### SECRET MANAGER ###########

resource "google_secret_manager_secret" "notification_service" {
  secret_id = "notification-service"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "notification_service" {
  secret = google_secret_manager_secret.notification_service.id
  secret_data = jsonencode({
    "database_password"         = null
    "database_host"             = null
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
