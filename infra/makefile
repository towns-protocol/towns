CMD                     ?= docker compose run --rm terraform
NOCACHECMD              ?= docker compose build --no-cache terraform
terraform_folder		= environments/${ENV}
terraform_workspace_name = $(ENV)
is_transient_lite       ?= false

override CI_AUTOAPPROVE := $(if $(filter true,$(CI_AUTOAPPROVE)),-auto-approve,$(CI_AUTOAPPROVE))
override is_transient_lite := $(if $(filter true,$(IS_TRANSIENT_LITE)),true,false)

# if the ENV is set to transient, then we will use the GIT_PR_NUMBER as the workspace name
override terraform_workspace_name := $(if $(filter transient,$(ENV)),transient-$(GIT_PR_NUMBER),$(ENV))

env:
	@cat /dev/null > .env
	echo "ENV=$(ENV)" >> .env
	echo "AWS_DEFAULT_REGION=us-east-1" >> .env
ifdef AWS_PROFILE
	echo "AWS_PROFILE=$(AWS_PROFILE)" >> .env
endif
	@echo AWS_ACCESS_KEY_ID=$(value AWS_ACCESS_KEY_ID) >> .env
	@echo AWS_SECRET_ACCESS_KEY=$(value AWS_SECRET_ACCESS_KEY) >> .env
	@echo TF_VAR_cloudflare_terraform_api_token=$(value TF_VAR_cloudflare_terraform_api_token) >> .env
	@echo TF_VAR_datadog_api_key=$(value TF_VAR_datadog_api_key) >> .env
	@echo TF_VAR_datadog_app_key=$(value TF_VAR_datadog_app_key) >> .env
ifeq ($(ENV), transient)
	@echo TF_VAR_git_pr_number=$(GIT_PR_NUMBER) >> .env
	@echo TF_VAR_is_transient_lite=$(is_transient_lite) >> .env
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
	$(CMD) terraform -chdir=${terraform_folder} init -backend-config=../../backend.conf --reconfigure

# This is to reinitialise terraform, including image rebuild from start
clean_init: env check
	$(NOCACHECMD)
	@make _clean_init

_clean_init:
	rm -rf ${ENV}/.terraform
	terraform -chdir=${terraform_folder} init -backend-config=../../backend.conf --reconfigure

# This is for terraform init
init: env check
	@$(CMD) make _init GIT_PR_NUMBER=$(GIT_PR_NUMBER)

_init:
	terraform -chdir=${terraform_folder} init -backend-config=../../backend.conf --reconfigure

# This will format the whole terraform code
fmt: env
	$(CMD) terraform fmt --recursive

lint: env
	$(CMD) terraform fmt --recursive --check

# This will validate the terraform scripts
validate: env
	$(CMD) terraform validate

# This will plan the terraform infra changes
plan: env check
	@$(CMD) make _plan GIT_PR_NUMBER=$(GIT_PR_NUMBER)

_plan:
	terraform -chdir=${terraform_folder} workspace select $(terraform_workspace_name) || terraform -chdir=${terraform_folder} workspace new $(terraform_workspace_name)
	terraform -chdir=${terraform_folder} plan

# This will apply the terraform infra changes
apply: env check
	@$(CMD) make _apply GIT_PR_NUMBER=$(GIT_PR_NUMBER) CI_AUTOAPPROVE=$(CI_AUTOAPPROVE)

_apply:
	terraform -chdir=${terraform_folder} workspace select $(terraform_workspace_name) || terraform -chdir=${terraform_folder} workspace new $(terraform_workspace_name)
	terraform -chdir=${terraform_folder} apply $(CI_AUTOAPPROVE)

wait_for_lock_release:
	$(CMD) sh lock_wait.sh

# This will destroy the terraform infra
destroy: env check wait_for_lock_release
	@$(CMD) make _destroy GIT_PR_NUMBER=$(GIT_PR_NUMBER) CI_AUTOAPPROVE=$(CI_AUTOAPPROVE)

_destroy:
	terraform -chdir=${terraform_folder} workspace select $(terraform_workspace_name) || terraform -chdir=${terraform_folder} workspace new $(terraform_workspace_name)
	terraform -chdir=${terraform_folder} destroy $(CI_AUTOAPPROVE)
