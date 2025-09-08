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
    unzip \
    openssl && \
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

# Install Go
RUN curl -fsSL https://golang.org/dl/go1.21.12.linux-arm64.tar.gz | tar -C /usr/local -xzf -

# Install Foundry
RUN curl -L https://foundry.paradigm.xyz | bash && \
    /root/.foundry/bin/foundryup

# Add both Go and Foundry binaries to PATH
ENV PATH="/usr/local/go/bin:/root/.foundry/bin:${PATH}"

# Set working directory
WORKDIR /app

# Copy package files for dependency installation (layer caching)
COPY ./package.json /app/package.json
COPY ./yarn.lock /app/yarn.lock
COPY ./.yarnrc.yml /app/.yarnrc.yml
COPY ./.yarn/releases /app/.yarn/releases
COPY ./.yarn/plugins /app/.yarn/plugins
COPY ./turbo.json /app/turbo.json

# Copy workspace package.json files (needed for workspace resolution)
COPY ./protocol/package.json /app/protocol/package.json
COPY ./packages/contracts/package.json /app/packages/contracts/package.json
COPY ./packages/prettier-config/package.json /app/packages/prettier-config/package.json

# Install dependencies with Yarn
RUN yarn install && yarn cache clean

# Copy minimal dependencies for Go build (exclude run_files for reliable caching)
COPY ./core /app/core
RUN rm -rf /app/core/run_files
COPY ./packages/contracts/.env.localhost /app/packages/contracts/.env.localhost

# Build Go binary (cached unless core code or env changes)
RUN cd ./core && just build

# Copy remaining project files 
COPY ./packages/contracts /app/packages/contracts
COPY ./packages/prettier-config /app/packages/prettier-config
COPY ./scripts /app/scripts

# Setup anvils and deploy contracts
RUN bash ./packages/contracts/docker/setup.sh && sleep 5

# Remove Go binary to reduce image size (keep configs)
RUN rm -rf /app/core/run_files/local_dev/bin

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
COPY --from=builder /app/base-anvil-state.json /app/base-anvil-state.json
COPY --from=builder /app/river-anvil-state.json /app/river-anvil-state.json

# Create scripts directory structure
RUN mkdir -p /app/scripts /app/packages/contracts/docker /app/configs

# Copy minimal scripts needed for runtime
COPY --from=builder /app/packages/contracts/docker/run.sh /app/packages/contracts/docker/run.sh
COPY --from=builder /app/scripts/start-local-basechain.sh /app/scripts/start-local-basechain.sh
COPY --from=builder /app/scripts/start-local-riverchain.sh /app/scripts/start-local-riverchain.sh

# Copy generated configs for extraction (bin already removed in builder stage)
COPY --from=builder /app/core/run_files /app/configs

# Default command
ENTRYPOINT ["/bin/bash", "./packages/contracts/docker/run.sh"]
