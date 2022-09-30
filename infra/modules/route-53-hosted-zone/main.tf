locals {
  tags = {
        Managed_By = "Terraform"
        Environment = var.environment
  }
}

resource "aws_route53_zone" "primary" {
  name = var.hosted_zone_name
  tags = local.tags
}

output "hosted_zone_id" {
  value = aws_route53_zone.primary.id
}