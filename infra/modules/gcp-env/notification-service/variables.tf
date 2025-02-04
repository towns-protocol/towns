variable "google_service_account" {
  type = object({
    member = string
    email  = string
  })
}

variable "migration_config" {
  description = "Migration configuration for the notification service"
  type = object({
    container_provider : string
    rds_public_access : bool
  })

  default = {
    container_provider = "aws"
    rds_public_access  = false
  }
}

variable "alb_ip" {
  type = string
}

variable "project_id" {
  type = string
}
