#!/bin/sh

terraform init
terraform workspace new global
terraform workspace select global
