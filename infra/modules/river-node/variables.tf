variable "vpc_id" {
  description = "The vpc id"
  type        = string
}

variable "git_pr_number" {
  description = "The GitHub Pull Request number"
  type        = number
  default     = null
}

variable "node_number" {
  description = "The number assigned to the node. i.e 1 for river-1-test-beta.towns.com"
  type        = number
}

variable "ecs_cluster" {
  description = "Name and id of the ecs cluster"
  type = object({
    name = string
    id   = string
  })
}

variable "node_subnets" {
  description = "A list of subnets to associate with the river nodes"
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
  description = "Loadbalancer DNS name for river node"
  type        = string
}

variable "push_notification_worker_url" {
  description = "The url of the push notification worker"
  type        = string
}

variable "is_transient" {
  description = "Whether or not this db is transient"
  type        = bool
  default     = false
}

variable "river_node_db" {
  description = "The river node db module"
  type        = any
}
