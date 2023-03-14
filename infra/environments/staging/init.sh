#!/bin/sh

terraform init -backend-config=../../backend.conf
terraform workspace new staging
terraform workspace select staging