output "vpc" {
  value = module.vpc
}

output "k8s_subnet" {
  value = local.k8s_subnet
}

output "k8s_subnet_secondary_ranges" {
  value = local.k8s_subnet_secondary_ranges
}
