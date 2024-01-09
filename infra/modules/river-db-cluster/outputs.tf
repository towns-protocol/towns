output "rds_aurora_postgresql" {
  value = module.rds_aurora_postgresql
}

data "aws_rds_cluster" "river_rds_cluster" {
  cluster_identifier = module.rds_aurora_postgresql.cluster_id
}

output "root_user_secret_arn" {
  depends_on = [module.rds_aurora_postgresql]
  value      = data.aws_rds_cluster.river_rds_cluster.master_user_secret[0].secret_arn
}

output "river_rds_cluster_sg" {
  value = module.rds_aurora_postgresql.security_group_id

}
