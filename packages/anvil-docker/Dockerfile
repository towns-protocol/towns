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

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash && \
    ln -s /root/.bun/bin/bun /usr/local/bin/bun && \
    ln -s /root/.bun/bin/bunx /usr/local/bin/bunx

# Install just from precompiled binary
RUN curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to /usr/local/bin

# Install Foundry
RUN curl -L https://foundry.paradigm.xyz | bash && \
    /root/.foundry/bin/foundryup

# Add Foundry binaries to PATH
ENV PATH="/root/.foundry/bin:${PATH}"

# Install solc 0.8.33 from argotorg (svm doesn't support linux/arm64)
ARG SOLC_VERSION=0.8.33
RUN mkdir -p /root/.svm/${SOLC_VERSION} && \
    if [ "$(uname -m)" = "aarch64" ]; then \
        curl -L -o /root/.svm/${SOLC_VERSION}/solc-${SOLC_VERSION} \
            https://github.com/argotorg/solidity/releases/download/v${SOLC_VERSION}/solc-static-linux-arm; \
    else \
        curl -L -o /root/.svm/${SOLC_VERSION}/solc-${SOLC_VERSION} \
            https://github.com/argotorg/solidity/releases/download/v${SOLC_VERSION}/solc-static-linux; \
    fi && \
    chmod +x /root/.svm/${SOLC_VERSION}/solc-${SOLC_VERSION}

# Set working directory
WORKDIR /app

# Copy package files for dependency installation (layer caching)
COPY package.json bunfig.toml bun.lock ./

# Copy workspace package.json files (needed for workspace resolution)
COPY ./protocol/package.json protocol/
COPY ./packages/contracts/package.json packages/contracts/
COPY ./packages/generated/package.json packages/generated/
COPY ./packages/prettier-config/package.json packages/prettier-config/

# Install dependencies with Bun
RUN bun install --ignore-scripts --filter @towns-protocol/contracts && bun pm cache rm

# Copy rest of the project files
COPY ./packages/anvil-docker/scripts packages/anvil-docker/scripts
COPY ./packages/contracts packages/contracts
COPY ./packages/generated/scripts packages/generated/scripts
COPY ./packages/prettier-config packages/prettier-config
COPY ./scripts scripts
COPY ./core/justfile core/justfile
COPY ./core/env/local core/env/local

# Setup anvils and deploy contracts
RUN bash ./packages/anvil-docker/scripts/setup.sh && sleep 5

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
COPY --from=builder /app/packages/anvil-docker/scripts/run.sh run.sh
COPY --from=builder /app/scripts/start-local-basechain.sh scripts/start-local-basechain.sh
COPY --from=builder /app/scripts/start-local-riverchain.sh scripts/start-local-riverchain.sh

# Default command
ENTRYPOINT ["/bin/bash", "./run.sh"]
