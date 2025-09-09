# ==========================================
# Stage 1: Builder - Full build environment
# ==========================================
FROM ubuntu:24.04 AS builder

# Use root user
USER root

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
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
    jq \
    unzip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Enable Corepack and install Yarn
RUN corepack enable && \
    corepack prepare yarn@3.8.0 --activate

# Install just from precompiled binary
RUN curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to /usr/local/bin

# Install Foundry
RUN curl -L https://foundry.paradigm.xyz | bash && \
    /root/.foundry/bin/foundryup

# Add Foundry binaries to PATH
ENV PATH="/root/.foundry/bin:${PATH}"

# Set working directory
WORKDIR /app

# Copy package files for dependency installation (layer caching)
COPY ./package.json package.json
COPY ./yarn.lock yarn.lock
COPY ./.yarnrc.yml .yarnrc.yml
COPY ./.yarn/releases .yarn/releases
COPY ./.yarn/plugins .yarn/plugins
COPY ./turbo.json turbo.json

# Copy workspace package.json files (needed for workspace resolution)
COPY ./protocol/package.json protocol/package.json
COPY ./packages/contracts/package.json packages/contracts/package.json
COPY ./packages/prettier-config/package.json packages/prettier-config/package.json

# Install dependencies with Yarn
RUN yarn install && yarn cache clean

# Copy rest of the project files
COPY ./packages/contracts packages/contracts
COPY ./packages/prettier-config packages/prettier-config
COPY ./scripts scripts
COPY ./core/justfile core/justfile
COPY ./core/env/local core/env/local

# Setup anvils and deploy contracts
RUN bash ./packages/contracts/docker/setup.sh && sleep 5

# ==========================================
# Stage 2: Runtime - Minimal runtime image
# ==========================================
FROM ubuntu:24.04 AS runtime

# Use root user
USER root

# Install only runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    bash \
    curl \
    netcat-openbsd && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy Foundry binaries from builder (only anvil needed for runtime)
COPY --from=builder /root/.foundry/bin/anvil /usr/local/bin/anvil

# Copy state files (created during setup)
COPY --from=builder /app/base-anvil-state.json base-anvil-state.json
COPY --from=builder /app/river-anvil-state.json river-anvil-state.json

# Copy contract addresses for extraction
COPY --from=builder /app/local_dev local_dev

# Create scripts directory structure
RUN mkdir -p scripts

# Copy minimal scripts needed for runtime
COPY --from=builder /app/packages/contracts/docker/run.sh run.sh
COPY --from=builder /app/scripts/start-local-basechain.sh scripts/start-local-basechain.sh
COPY --from=builder /app/scripts/start-local-riverchain.sh scripts/start-local-riverchain.sh

# Default command
ENTRYPOINT ["/bin/bash", "./run.sh"]
