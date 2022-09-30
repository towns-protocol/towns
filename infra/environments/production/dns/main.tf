module global_constants {
  source = "../../../modules/global-constants"
}
data "aws_route53_zone" "primary_hosted_zone" {
  name = module.global_constants.hosted_zone_name
}

# # The DNS record for the landing page
# resource "aws_route53_record" "landing-page" {
#   zone_id = data.aws_route53_zone.primary_hosted_zone.zone_id
#   type = "A"
#   ttl = 30 # TODO: revert to 600 after stabilized
#   records = ["216.24.57.1"] # TODO: turn into variable, or pull out of the common setup
#   name = var.hosted_zone_name
# }

# # The DNS record for the landing page with www
# resource "aws_route53_record" "landing-page-www" {
#   zone_id = data.aws_route53_zone.primary_hosted_zone.zone_id
#   type = "CNAME"
#   ttl = 30 # TODO: revert to 600 after stabilized
#   records = ["zion-frontend.onrender.com"] # TODO: turn into variable, or pull out of the common setup
#   name = "www.${var.hosted_zone_name}"
# }

resource "aws_route53_record" "docs" {
  zone_id = data.aws_route53_zone.primary_hosted_zone.zone_id
  type = "CNAME"
  ttl = 30 # TODO: revert to 600 after stabilized
  records = ["45134ca3de-hosting.gitbook.io"] # TODO: turn into variable, or pull out of the common setup for a zion specific one
  name = "docs.${module.global_constants.hosted_zone_name}"
}

