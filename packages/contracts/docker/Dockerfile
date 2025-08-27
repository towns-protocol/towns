# Use Ubuntu 24.04 base image with glibc 2.38 and GCC 13+
FROM ubuntu:24.04

# Use root user
USER root

# Install basic build tools and dependencies
RUN apt-get update && \
    apt-get install -y \
    sudo \
    cmake \
    g++ \
    git \
    wget \
    bash \
    curl \
    netcat-openbsd \
    build-essential \
    lsb-release \
    ca-certificates \
    pkg-config \
    python3 \
    jq

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Enable Corepack and install pnpm
RUN corepack enable
RUN corepack prepare pnpm@latest --activate

# Verify pnpm installation
RUN pnpm --version

# Install just from precompiled binary
RUN curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to /usr/local/bin

# Install Foundry
RUN curl -L https://foundry.paradigm.xyz | bash && \
    /root/.foundry/bin/foundryup

# Add Foundry binaries to PATH
ENV PATH="/root/.foundry/bin:${PATH}"

# Set working directory
WORKDIR /app

# Copy project files
COPY ./core/justfile /app/core/justfile
COPY ./pnpm-lock.yaml /app/pnpm-lock.yaml
COPY ./pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY ./turbo.json /app/turbo.json
COPY ./package.json /app/package.json
COPY ./packages/contracts /app/packages/contracts
COPY ./packages/generated /app/packages/generated
COPY ./packages/prettier-config /app/packages/prettier-config
COPY ./scripts /app/scripts
COPY ./core/scripts /app/core/scripts
COPY ./core/env /app/core/env

# Install Node.js dependencies
RUN pnpm install --frozen-lockfile
RUN pnpm build
# Setup anvils
RUN bash ./packages/contracts/docker/setup.sh && sleep 5

# Default command
ENTRYPOINT ["/bin/bash", "./packages/contracts/docker/run.sh"]