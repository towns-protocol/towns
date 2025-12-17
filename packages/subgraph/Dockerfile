# ==========================================
# Stage 1: Builder - Full build environment
# ==========================================
FROM ubuntu:24.04 AS builder

# Set working directory
WORKDIR /river

ARG VER_VERSION=version_unset
ARG VER_BRANCH=branch_unset
ARG VER_COMMIT=commit_unset
ARG GIT_SHA

# Install build dependencies (cached layer - rarely changes)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    unzip \
    netcat-openbsd \
    build-essential \
    git \
    make \
    ca-certificates \
    lsb-release \
    python3 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash && \
    ln -s /root/.bun/bin/bun /usr/local/bin/bun && \
    ln -s /root/.bun/bin/bunx /usr/local/bin/bunx

# Install Foundry
RUN curl -L https://foundry.paradigm.xyz | bash && \
    ~/.foundry/bin/foundryup

# Add Foundry binaries to PATH
ENV PATH="/root/.foundry/bin:${PATH}"

# ==========================================
# Dependency Installation (Cached Layers)
# ==========================================

# Copy monorepo configuration for dependency resolution
COPY buf.yaml bunfig.toml bun.lock package.json turbo.json ./
COPY packages/tsconfig.base.json ./packages/

# Copy workspace package.json files for dependency resolution
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/generated/package.json ./packages/generated/
COPY packages/utils/package.json ./packages/utils/
COPY packages/prettier-config/package.json ./packages/prettier-config/
COPY packages/proto/package.json ./packages/proto/
COPY packages/subgraph/package.json ./packages/subgraph/
COPY packages/web3/package.json ./packages/web3/
COPY protocol/package.json ./protocol/

# Install all dependencies (cached unless package.json files change)
RUN bun install --ignore-scripts && bun pm cache rm

# ==========================================
# Source Code and Build
# ==========================================

# Copy remaining source code
COPY packages/contracts ./packages/contracts/
COPY packages/generated ./packages/generated/
COPY packages/utils ./packages/utils/
COPY packages/prettier-config ./packages/prettier-config/
COPY packages/proto ./packages/proto/
COPY packages/subgraph ./packages/subgraph/
COPY packages/web3 ./packages/web3/
COPY protocol ./protocol/

# Build all packages using turbo
# First generate contract typings (web3 imports from @towns-protocol/contracts/typings)
RUN bun run turbo typings --filter=@towns-protocol/contracts
# Then build all dependencies (web3, utils, generated, etc.)
RUN bun run turbo build --filter=@towns-protocol/subgraph...

# Prepare subgraph for runtime
RUN chmod +x ./packages/subgraph/docker-entrypoint.sh

# ==========================================
# Stage 2: Runtime - Minimal runtime image
# ==========================================
FROM oven/bun:1.3-slim AS runtime

# Set working directory
WORKDIR /river

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    netcat-openbsd \
    ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy built node_modules from builder
COPY --from=builder /river/node_modules ./node_modules

# Copy monorepo configuration
COPY --from=builder /river/package.json /river/bun.lock /river/turbo.json ./

# Copy only runtime-required packages
COPY --from=builder /river/packages/contracts/deployments ./packages/contracts/deployments
COPY --from=builder /river/packages/contracts/typings ./packages/contracts/typings
COPY --from=builder /river/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=builder /river/packages/utils ./packages/utils/
COPY --from=builder /river/packages/generated ./packages/generated/
COPY --from=builder /river/packages/proto ./packages/proto/
COPY --from=builder /river/packages/subgraph ./packages/subgraph/
COPY --from=builder /river/packages/web3 ./packages/web3/

# Set working directory to subgraph package
WORKDIR /river/packages/subgraph

# Expose the default Ponder port
EXPOSE 42069

# Set environment variables
ENV NODE_ENV=production
ENV DATABASE_SCHEMA=public

# Use entrypoint script
ENTRYPOINT ["./docker-entrypoint.sh"]
