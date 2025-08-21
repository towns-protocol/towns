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
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
COPY packages/tsconfig.base.json ./packages/
COPY buf.yaml ./

# Copy the required packages
COPY packages/subgraph ./packages/subgraph/
COPY packages/prettier-config ./packages/prettier-config/
COPY packages/contracts ./packages/contracts/

# Add entrypoint script
RUN chmod +x ./packages/subgraph/docker-entrypoint.sh

# Install dependencies
RUN yarn install

# Build contracts
WORKDIR /river/packages/contracts
RUN make build
WORKDIR /river

# Generate contract typings
RUN yarn workspace @towns-protocol/contracts typings

# Build proto package (dependency of dlog)
RUN yarn workspace @towns-protocol/proto build

# Build dlog package (dependency of web3)
RUN yarn workspace @towns-protocol/dlog build

# Build web3 package
RUN yarn workspace @towns-protocol/web3 build

# Set working directory to subgraph package
WORKDIR /river/packages/subgraph

# Expose the default Ponder port
EXPOSE 42069

# Set environment variables
ENV NODE_ENV=production
ENV DATABASE_SCHEMA=public

# Use entrypoint script
ENTRYPOINT ["./docker-entrypoint.sh"]
