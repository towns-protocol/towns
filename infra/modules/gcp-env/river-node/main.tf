########### SECRET MANAGER - RIVER NODE LOCAL CREDENTIALS ###########

resource "google_secret_manager_secret" "river_node_local_credentials" {
  secret_id = "river-node-local-credentials"
  replication {
    auto {}
  }
}

locals {
  stream_node_local_credentials = {
    for i in range(var.node_config.num_stream_nodes) : "river-stream-${i + 1}" => {
      database_password  = null
      wallet_private_key = null
    }
  }
  archive_node_local_credentials = {
    for i in range(var.node_config.num_archive_nodes) : "river-archive-${i + 1}" => {
      database_password  = null
      wallet_private_key = null
    }
  }
  all_local_credentials = merge(local.stream_node_local_credentials, local.archive_node_local_credentials)
}

resource "google_secret_manager_secret_version" "river_node_local_credentials" {
  secret      = google_secret_manager_secret.river_node_local_credentials.id
  secret_data = jsonencode(local.all_local_credentials)

  lifecycle {
    ignore_changes = [secret_data]
  }
}

resource "google_secret_manager_secret_iam_member" "river_node_local_credentials" {
  secret_id = google_secret_manager_secret.river_node_local_credentials.id
  role      = "roles/secretmanager.secretAccessor"
  member    = var.google_service_account.member
}

########### SECRET MANAGER - RIVER NODE DB HOST ###########

resource "google_secret_manager_secret" "river_node_db_host" {
  secret_id = "river-node-db-host"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "river_node_db_host" {
  secret = google_secret_manager_secret.river_node_db_host.id

  secret_data = jsonencode({
    "db_host" = null
  })

  lifecycle {
    ignore_changes = [secret_data]
  }
}

resource "google_secret_manager_secret_iam_member" "river_node_db_host" {
  secret_id = google_secret_manager_secret.river_node_db_host.id
  role      = "roles/secretmanager.secretAccessor"
  member    = var.google_service_account.member
}

# ########### STATIC IP ADDRESSES ###########


# resource "google_compute_address" "river_stream_ip_address" {
#   provider = google-beta

#   project = var.project_id

#   count = var.node_config.num_stream_nodes

#   name   = "river-stream-${count.index + 1}-ip-address"
#   region = var.region

#   address_type = "EXTERNAL"
#   ip_version   = "IPV4"
# }

# resource "google_compute_address" "river_archive_ip_address" {
#   provider = google-beta

#   project = var.project_id

#   count = var.node_config.num_archive_nodes

#   name   = "river-archive-${count.index + 1}-ip-address"
#   region = var.region

#   address_type = "EXTERNAL"
#   ip_version   = "IPV4"
# }
