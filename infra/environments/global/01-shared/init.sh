#!/bin/sh

terraform init -backend-config=../../../backend.conf
terraform workspace new global
terraform workspace select global
