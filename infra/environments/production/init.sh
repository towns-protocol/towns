#!/bin/sh

# Default values
backend_folder="../../backends"
backend_config="$backend_folder/backend.conf"
workspace_name="production"

# Function to display usage instructions
usage() {
    echo "Usage: $0 [--beta]"
    exit 1
}

# Parse command line arguments
while [ "$#" -gt 0 ]; do
    case "$1" in
        --beta)
            backend_config="$backend_folder/backend-beta.conf"
            workspace_name="$workspace_name-beta"
            shift
            ;;
        *)
            usage
            ;;
    esac
done

# Initialize Terraform
terraform init -backend-config="$backend_config"

# Create and select workspace
terraform workspace new "$workspace_name"
terraform workspace select "$workspace_name"