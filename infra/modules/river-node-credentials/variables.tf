variable "node_number" {
  description = "The number assigned to the node. i.e 1 for river1.nodes.gamma.towns.com"
  type        = number
}

# TODO: this is temporary. remove 
variable "environment" {
  description = "The environment the node is being deployed to"
  type        = string
}

variable "node_prefix" {
  description = "The prefix for the node name"
  type        = string
}
