#!/bin/sh

# read the secret from './gh-runners-app.pem'
export TF_VAR_gh_app_private_key=$(cat ./gh-runners-app.pem)

terraform workspace select global
terraform apply
