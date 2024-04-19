variable "vpc_id" {
  description = "The vpc id"
  type        = string
}

variable "subnets" {
  description = "A list of subnets to associate with the network load balancer"
  type        = list(string)
}

variable "is_transient" {
  description = "Whether or not this nlb will be used by transient river nodes"
  type        = bool
  default     = false
}

variable "dns_name" {
  description = "The domain name to associate with the network load balancer"
  type        = string
  default     = null
}

# Used to differentiate between nlbs in the same environment
variable "nlb_id" {
  type    = string
  default = ""
}
