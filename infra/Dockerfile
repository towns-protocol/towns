FROM python:3.11-alpine

ENV TERRAFORM_VERSION=1.6.3

# Update package list and install packages
#=========================================
# curl to support downloading package using curl
# git needed for module download while terraform init
# make is used to run makefile inside the container as a part of 3musketeers patterns
# bash is for shell into the container for debugging purpose
# npm is for installing all nodejs dependecies to support lambdas
# jq is to enable parsing any json output response return (lambdas)
# aws-cli to enable running any aws cli commands
#==========================================
RUN apk update && apk add --no-cache \
  curl \
  git \
  make \
  bash \
  npm \
  jq \
  aws-cli

# Install Terraform
RUN wget --quiet https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip \
  && unzip terraform_${TERRAFORM_VERSION}_linux_amd64.zip \
  && mv terraform /usr/bin \
  && rm terraform_${TERRAFORM_VERSION}_linux_amd64.zip

CMD [ "terraform" ]
