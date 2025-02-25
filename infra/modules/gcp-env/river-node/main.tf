########### SECRET MANAGER - RIVER NODE LOCAL CREDENTIALS ###########

resource "google_secret_manager_secret" "river_node_local_credentials" {
  secret_id = "river-node-local-credentials"
  replication {
    auto {}
  }

  lifecycle {
    prevent_destroy = true
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

########### GCP ALLOY POSTGRES ###########

module "river_node_db" {
  source = "./river-node-db"

  project_id = var.project_id

  region                 = var.region
  network                = var.network
  google_service_account = var.google_service_account

  k8s_subnet_cidr        = var.k8s_subnet_cidr
  private_vpc_connection = var.private_vpc_connection
}
