variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "zones" {
  type = list(string)
}

variable "network_name" {
  type = string
}

variable "subnetwork_name" {
  type = string
}

variable "secondary_ranges" {
  type = map(object({
    range_name    = string
    ip_cidr_range = string
  }))
}
