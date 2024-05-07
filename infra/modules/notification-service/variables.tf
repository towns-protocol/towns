variable "vpc_id" {
  description = "The vpc id"
  type        = string
}

variable "git_pr_number" {
  description = "The GitHub Pull Request number"
  type        = number
  default     = null
}

variable "ecs_cluster" {
  description = "Name and id of the ecs cluster"
  type = object({
    name = string
    id   = string
  })
}

variable "subnets" {
  description = "A list of subnets to associate with the river service"
  type        = list(string)
}

variable "alb_security_group_id" {
  description = "The security group id of the alb"
  type        = string
}

variable "alb_https_listener_arn" {
  description = "The arn of the alb https listener"
  type        = string
}

variable "alb_dns_name" {
  description = "Loadbalancer DNS name for the service"
  type        = string
}

variable "is_transient" {
  description = "Whether or not this db is transient"
  type        = bool
  default     = false
}

variable "vapid_key_secret_arn" {
  description = "The arn of the vapid key secret"
  type        = string
}

variable "apns_auth_key_secret_arn" {
  description = "The arn of the apns auth key secret"
  type        = string
}

variable "vapid_subject" {
  type = string
}

variable "river_node_db" {
  description = "The river node db module"
  type        = any
}

variable "river_node_url" {
  type = string
}
