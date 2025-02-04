output "ip" {
  value = google_compute_global_address.main_alb.address
}
