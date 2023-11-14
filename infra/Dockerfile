FROM python:3.11-alpine

ENV AWSCLI_VERSION=2.10.0
ENV TERRAFORM_VERSION=1.6.3

# Update package list and install packages
RUN apk update && apk add --no-cache \
  curl \
  make \
  cmake \
  build-base \
  gcc \
  libc-dev \
  libffi-dev \
  openssl-dev \
  git \
  bash \
  openssh \
  vim

# Upgrade pip in a separate layer
RUN pip install --upgrade pip

# Install AWS CLI
RUN curl https://codeload.github.com/aws/aws-cli/tar.gz/refs/tags/${AWSCLI_VERSION} --output aws-cli-${AWSCLI_VERSION}.tar.gz \
  && tar -xf aws-cli-${AWSCLI_VERSION}.tar.gz \
  && cd aws-cli-${AWSCLI_VERSION} \
  && python -m pip install -q -r requirements.txt \
  && python -m pip install -e .

# Install Terraform
RUN wget --quiet https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip \
  && unzip terraform_${TERRAFORM_VERSION}_linux_amd64.zip \
  && mv terraform /usr/bin \
  && rm terraform_${TERRAFORM_VERSION}_linux_amd64.zip

CMD [ "terraform" ]
