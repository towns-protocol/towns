variable "vpc_id" {
  description = "The vpc id"
  type        = string
}

variable "subnets" {
  description = "A list of subnets to associate with the follower tasks"
  type        = list(string)
}

variable "ecs_cluster" {
  description = "Name and id of the ecs cluster"
  type = object({
    name = string
    id   = string
  })
}

variable "tags" {
  description = "Tags to be added on follower resources"
  type        = map(any)
  default     = {}
}

variable "river_node_url" {
  description = "river node url to pass as environment details"
  type        = string
}

variable "base_chain_rpc_url" {
  description = "base chain rpc url to pass as environment details"
  type        = string
}

variable "redis_url" {
  description = "redis endpoint to pass as an environment details"
  type        = string
}

variable "loadtest_duration" {
  description = "number of follower nodes"
  type        = number
}

variable "follower_id" {
  type = number
}
