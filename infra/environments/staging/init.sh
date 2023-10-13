#!/bin/sh

# Default values
backend_folder="../../backends"
backend_config="$backend_folder/backend.conf"
workspace_name="staging"

# Initialize Terraform
terraform init -backend-config="$backend_config"

# Create and select workspace
terraform workspace new "$workspace_name"
terraform workspace select "$workspace_name"