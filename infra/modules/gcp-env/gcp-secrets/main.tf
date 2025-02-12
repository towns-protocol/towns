####### RPC URLs #######

resource "google_secret_manager_secret" "rpc_urls" {
  secret_id = "rpc_urls"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "rpc_urls" {
  secret = google_secret_manager_secret.rpc_urls.id
  secret_data = jsonencode({
    "river" = null
    "base"  = null
  })

  lifecycle {
    ignore_changes = [secret_data]
  }
}

resource "google_secret_manager_secret_iam_member" "rpc_urls" {
  secret_id = google_secret_manager_secret.rpc_urls.id
  role      = "roles/secretmanager.secretAccessor"
  member    = var.google_service_account.member
}

####### CHAINS_STRING SECRET #######

# a key-value where each key is a chain id and the value is the rpc url
resource "google_secret_manager_secret" "chains_string" {
  secret_id = "chains_string"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_iam_member" "chains_string" {
  secret_id = google_secret_manager_secret.chains_string.id
  role      = "roles/secretmanager.secretAccessor"
  member    = var.google_service_account.member
}

####### Datadog Secret #######

resource "google_secret_manager_secret" "datadog" {
  secret_id = "datadog-secret"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "datadog" {
  secret = google_secret_manager_secret.datadog.id
  secret_data = jsonencode({
    "api-key" = null
    "app-key" = null
  })

  lifecycle {
    ignore_changes = [secret_data]
  }
}

resource "google_secret_manager_secret_iam_member" "datadog" {
  secret_id = google_secret_manager_secret.rpc_urls.id
  role      = "roles/secretmanager.secretAccessor"
  member    = var.google_service_account.member
}


########### Cloudflare Secret ###########

resource "google_secret_manager_secret" "cloudflare" {
  secret_id = "cloudflare"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "cloudflare" {
  secret = google_secret_manager_secret.cloudflare.id
  secret_data = jsonencode({
    "api_token" = null
    "api_key"   = null
  })

  lifecycle {
    ignore_changes = [secret_data]
  }
}

resource "google_secret_manager_secret_iam_member" "cloudflare" {
  secret_id = google_secret_manager_secret.cloudflare.id
  role      = "roles/secretmanager.secretAccessor"
  member    = var.google_service_account.member
}
