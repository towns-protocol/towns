CMD                     ?= docker compose run --rm terraform
NOCACHECMD              ?= docker compose build --no-cache terraform
CI_AUTOAPPROVE          ?= false
terraform_folder		= environments/${ENV}
backend_folder			= backends
terraform_workspace_name = $(ENV)
reference_webapp_name    = test-beta

override CI_AUTOAPPROVE := $(if $(filter true,$(CI_AUTOAPPROVE)),-auto-approve,)

# if the ENV is set to transient, then we will use the GIT_PR_NUMBER as the workspace name
override terraform_workspace_name := $(if $(filter transient,$(ENV)), transient-$(GIT_PR_NUMBER), $(ENV))

env:
	@cat /dev/null > .env
	echo "ENV=$(ENV)" >> .env
ifdef AWS_PROFILE
	echo "AWS_PROFILE=$(AWS_PROFILE)" >> .env
endif
	@echo AWS_ACCESS_KEY_ID=$(value AWS_ACCESS_KEY_ID) >> .env
	@echo AWS_SECRET_ACCESS_KEY=$(value AWS_SECRET_ACCESS_KEY) >> .env
	@echo TF_VAR_datadog_api_key=$(value TF_VAR_datadog_api_key) >> .env
	@echo TF_VAR_datadog_app_key=$(value TF_VAR_datadog_app_key) >> .env
	@echo TF_VAR_cloudflare_terraform_api_token=$(value TF_VAR_cloudflare_terraform_api_token) >> .env
ifeq ($(ENV), transient)
	@echo TF_VAR_preview_app_cname_record_name=$(value GIT_PR_NUMBER).app-preview >> .env
	@echo TF_VAR_preview_app_cname_record_value=$(value reference_webapp_name)-pr-$(value GIT_PR_NUMBER).onrender.com >> .env
endif


check:
ifndef ENV
	$(error ENV(terraform workspace) is undefined)
endif
ifeq ($(filter -auto-approve,$(CI_AUTOAPPROVE)), -auto-approve)
ifneq ($(ENV), transient)
	$(error CI_AUTOAPPROVE is set to true, but ENV is not transient)
endif
endif

ifeq ($(ENV), transient)
ifndef GIT_PR_NUMBER
	$(error GIT_PR_NUMBER is undefined)
endif
endif

# This is shell to login inside the container
shell: env check
	$(CMD) /bin/bash

# This is clean setup after removing the .terraform folder and reinitialise the terraform
clean: env check
	$(CMD) /bin/bash -c 'rm -rf ${ENV}/.terraform'
	$(CMD) terraform -chdir=${terraform_folder} init -backend-config=../../${backend_folder}/backend.conf --reconfigure

# This is to reinitialise terraform, including image rebuild from start
clean_init: env check
	$(NOCACHECMD)
	$(CMD) /bin/bash -c 'rm -rf ${ENV}/.terraform'
	$(CMD) terraform -chdir=${terraform_folder} init -backend-config=../../${backend_folder}/backend.conf --reconfigure

# This is for terraform init
init: env check
	$(CMD) terraform -chdir=${terraform_folder} init -backend-config=../../${backend_folder}/backend.conf --reconfigure

# This will format the whole terraform code
fmt:
	$(CMD) terraform fmt --recursive

# This will validate the terraform scripts
validate: env
	$(CMD) terraform validate

# This will plan the terraform infra changes
plan: env check
	$(CMD) terraform -chdir=${terraform_folder} workspace select $(terraform_workspace_name) || $(CMD) terraform -chdir=${terraform_folder} workspace new $(terraform_workspace_name)
	$(CMD) terraform -chdir=${terraform_folder} plan

# This will apply the terraform infra changes
apply: env check
	$(CMD) terraform -chdir=${terraform_folder} workspace select $(terraform_workspace_name) || $(CMD) terraform -chdir=${terraform_folder} workspace new $(terraform_workspace_name)
	$(CMD) terraform -chdir=${terraform_folder} apply $(CI_AUTOAPPROVE)

# This will destroy the terraform infra
destroy: env check
	$(CMD) terraform -chdir=${terraform_folder} workspace select $(terraform_workspace_name) || $(CMD) terraform -chdir=${terraform_folder} workspace new $(terraform_workspace_name)
	$(CMD) terraform -chdir=${terraform_folder} destroy $(CI_AUTOAPPROVE)
