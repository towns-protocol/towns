# A GCP Alloy psql DB for river nodes

########### GCP ALLOY POSTGRES ###########

# Generate a random password for the database

locals {
  db_root_user = "root"
}

resource "random_password" "root_db_password" {
  length  = 16
  special = false
}

resource "google_alloydb_cluster" "river_node_db" {
  cluster_id = "river-node-db-cluster"
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
    service     = "river-node"
  }

  depends_on = [var.private_vpc_connection]

  continuous_backup_config {
    enabled              = true
    recovery_window_days = 7
  }
}


resource "google_alloydb_instance" "river_node_primary" {
  cluster       = google_alloydb_cluster.river_node_db.name
  instance_id   = "river-node-db-primary"
  instance_type = "PRIMARY"

  machine_config {
    cpu_count = var.db_min_cpu_count
  }

  database_flags = {
    "max_connections" = "1000"
  }

  availability_type = "REGIONAL"

  depends_on = [google_alloydb_cluster.river_node_db]

  client_connection_config {
    ssl_config {
      ssl_mode = "ALLOW_UNENCRYPTED_AND_ENCRYPTED"
    }
  }
}

########### SECRET MANAGER ###########
resource "google_secret_manager_secret" "db_credentials" {
  secret_id = "river-node-db-credentials"
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

    "target_db_host" = google_alloydb_instance.river_node_primary.ip_address

    "target_db_root_user"     = local.db_root_user
    "target_db_root_password" = random_password.root_db_password.result
  })

  depends_on = [google_alloydb_instance.river_node_primary]
}

# tak var.google_service_account.member and give it roles/cloudsql.client
resource "google_project_iam_member" "river_node_db" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = var.google_service_account.member
}

# allow alloydb access to the k8s subnet
resource "google_compute_firewall" "gke_to_alloydb" {
  name    = "allow-gke-to-alloydb-river-node"
  network = var.network

  allow {
    protocol = "tcp"
    ports    = ["5432"]
  }

  source_ranges = [var.k8s_subnet_cidr]
  # destination_ranges = 
  target_tags = ["alloydb"]
}
