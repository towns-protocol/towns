locals {
  full_node_dns_names = [
    for i in range(0, var.num_full_nodes) : "river${i + 1}.nodes.${terraform.workspace}"
  ]

  archive_node_dns_names = [
    for i in range(0, var.num_archive_nodes) : "archive${i + 1}.nodes.${terraform.workspace}"
  ]

  full_node_urls = [
    for i in range(0, var.num_full_nodes) : "https://${local.full_node_dns_names[i]}.towns.com"
  ]

  archive_node_urls = [
    for i in range(0, var.num_archive_nodes) : "https://${local.archive_node_dns_names[i]}.towns.com"
  ]
}

module "full-river-node-credentials" {
  count       = var.num_full_nodes
  source      = "../river-node-credentials"
  environment = terraform.workspace // TODO: remove this var.environment reference, and replace it with terraform.workspace
  node_number = count.index + 1
  node_prefix = "full"
}

module "archive-river-node-credentials" {
  count       = var.num_archive_nodes
  source      = "../river-node-credentials"
  environment = terraform.workspace // TODO: remove this var.environment reference, and replace it with terraform.workspace
  node_number = count.index + 1
  node_prefix = "archive"
}

output "full_nodes" {
  value = [
    for i in range(0, var.num_full_nodes) : {
      node_number = i + 1
      node_name   = "river${i + 1}-${terraform.workspace}"
      dns_name    = local.full_node_dns_names[i]
      url         = local.full_node_urls[i]
      run_mode    = "full"
      credentials = module.full-river-node-credentials[i]
    }
  ]
}

output "archive_nodes" {
  value = [
    for i in range(0, var.num_archive_nodes) : {
      node_number = i + 1
      node_name   = "archive${i + 1}-${terraform.workspace}"
      dns_name    = local.archive_node_dns_names[i]
      url         = local.archive_node_urls[i]
      run_mode    = "archive"
      credentials = module.archive-river-node-credentials[i]
    }
  ]
}
