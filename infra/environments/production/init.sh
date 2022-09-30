#!/bin/sh

terraform init -backend-config=../../backend.conf
terraform workspace new production
terraform workspace select production