#!/bin/sh

terraform init -backend-config=../../backend.conf
terraform workspace new test
terraform workspace select test