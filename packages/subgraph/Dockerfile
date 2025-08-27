# Use Node.js 20 as the base image
FROM node:20-slim

# Set working directory
WORKDIR /river

ARG VER_VERSION=version_unset
ARG VER_BRANCH=branch_unset
ARG VER_COMMIT=commit_unset
ARG GIT_SHA

# Install curl and other required packages for Foundry installation
RUN apt-get update && \
    apt-get install -y curl build-essential git make && \
    rm -rf /var/lib/apt/lists/*

# Install Foundry
# Note: Foundryup is not working, but the latest nightly version is working
RUN curl -L https://foundry.paradigm.xyz | bash && \
    ~/.foundry/bin/foundryup -i nightly

# Add Foundry binaries to PATH
ENV PATH="/root/.foundry/bin:${PATH}"

# Enable Corepack for Yarn 3.x support
RUN corepack enable

# Copy monorepo configuration from root
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/tsconfig.base.json ./packages/
COPY buf.yaml ./

# Copy the required packages
COPY packages/subgraph ./packages/subgraph/
COPY packages/prettier-config ./packages/prettier-config/
COPY packages/contracts ./packages/contracts/
COPY packages/web3 ./packages/web3/
COPY packages/generated ./packages/generated/
COPY packages/dlog ./packages/dlog/
COPY packages/proto ./packages/proto/
COPY protocol ./protocol/

# Add entrypoint script
RUN chmod +x ./packages/subgraph/docker-entrypoint.sh

# Install dependencies
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Build contracts
WORKDIR /river/packages/contracts
RUN make build
WORKDIR /river

# Generate contract typings (needed for Ponder to import ABIs)
RUN pnpm exec turbo run typings --filter=@towns-protocol/contracts

# Build the generated contracts typings package
RUN pnpm exec turbo run build --filter=@towns-protocol/generated

# Build proto package (dependency of dlog)
RUN pnpm exec turbo run build --filter=@towns-protocol/proto

# Build dlog package (dependency of web3)
RUN pnpm exec turbo run build --filter=@towns-protocol/dlog

# Build web3 package
RUN pnpm exec turbo run build --filter=@towns-protocol/web3

# Set working directory to subgraph package
WORKDIR /river/packages/subgraph

# Expose the default Ponder port
EXPOSE 42069

# Set environment variables
ENV NODE_ENV=production
ENV DATABASE_SCHEMA=public

# Use entrypoint script
ENTRYPOINT ["./docker-entrypoint.sh"]
