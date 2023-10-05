output "backend_bucket_name" {
  value = "here-not-there-terraform-state" 
  sensitive = true
}

output "backend_state_lock_table_name" {
  value = "here-not-there-terraform-state-lock" 
  sensitive = true
}

output "primary_hosted_zone_name" {
  value = "towns.com" 
  sensitive = true
}

output "environment" {
  value = terraform.workspace
  sensitive = false
}

output "tags" {
  value = {
    Managed_By  = "Terraform"
    # If workspace is test, say test-beta
    Environment = "${terraform.workspace == "test" ? "test-beta" : terraform.workspace}"
  
  }
  sensitive = true
}

output "region" {
  value = "us-east-1"
  sensitive = true
}