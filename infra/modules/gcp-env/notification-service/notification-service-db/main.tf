# A GCP Alloy psql DB for the notification service

########### GCP ALLOY POSTGRES ###########

# Generate a random password for the database

locals {
  db_root_user = "root"
  db_app_user  = "notification_service"
}

resource "random_password" "root_db_password" {
  length  = 16
  special = false
}

resource "random_password" "app_password" {
  length  = 16
  special = false
}

resource "google_alloydb_cluster" "notification_db" {
  cluster_id = "notification-service-db-cluster"
  location   = var.region

  lifecycle {
    ignore_changes = [network_config]
  }

  network_config {
    network = var.network
  }

  initial_user {
    user     = local.db_root_user
    password = random_password.root_db_password.result
  }

  labels = {
    environment = terraform.workspace
    service     = "notification-service"
  }

  depends_on = [var.private_vpc_connection]
}


# TODO: how do i make sure the db is backed up?
resource "google_alloydb_instance" "notification_primary" {
  cluster       = google_alloydb_cluster.notification_db.name
  instance_id   = "notification-service-db-primary"
  instance_type = "PRIMARY"

  machine_config {
    cpu_count = var.db_min_cpu_count
  }

  database_flags = {
    "max_connections" = "1000"
  }

  availability_type = "REGIONAL"

  depends_on = [google_alloydb_cluster.notification_db]

  client_connection_config {
    ssl_config {
      ssl_mode = "ALLOW_UNENCRYPTED_AND_ENCRYPTED"
    }
  }
}

########### SECRET MANAGER ###########
resource "google_secret_manager_secret" "db_credentials" {
  secret_id = "notification-service-db-credentials"
  replication {
    auto {}
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_secret_manager_secret_version" "db_credentials" {
  secret = google_secret_manager_secret.db_credentials.id
  secret_data = jsonencode({
    "source_db_host" = null

    "source_db_user"     = local.db_root_user
    "source_db_password" = null

    "target_db_host" = google_alloydb_instance.notification_primary.ip_address

    "target_db_root_user"     = local.db_root_user
    "target_db_root_password" = random_password.root_db_password.result

    "target_db_app_user"     = local.db_app_user
    "target_db_app_password" = random_password.app_password.result
  })

  depends_on = [google_alloydb_instance.notification_primary]
}

# tak var.google_service_account.member and give it roles/cloudsql.client
resource "google_project_iam_member" "notification_service_db" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = var.google_service_account.member
}

# allow alloydb access to the k8s subnet
resource "google_compute_firewall" "gke_to_alloydb" {
  name    = "allow-gke-to-alloydb"
  network = var.network

  allow {
    protocol = "tcp"
    ports    = ["5432"]
  }

  source_ranges = [var.k8s_subnet_cidr]
  # destination_ranges = 
  target_tags = ["alloydb"]
}
