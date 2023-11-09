#!/bin/sh

terraform init -backend-config=../../../backends/backend.conf
terraform workspace new global
terraform workspace select global