variable "google_service_account" {
  type = object({
    member = string
    email  = string
  })
}

variable "project_id" {
  type = string
}

variable "node_config" {
  type = object({
    num_stream_nodes  = number
    num_archive_nodes = number
  })
}

variable "region" {
  type = string
}
