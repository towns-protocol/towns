variable "google_service_account" {
  type = object({
    member = string
    email  = string
  })
}
