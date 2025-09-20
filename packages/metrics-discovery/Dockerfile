FROM ubuntu:24.04 AS builder

WORKDIR /river

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git curl ca-certificates build-essential unzip && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash && \
    ln -s /root/.bun/bin/bun /usr/local/bin/bun && \
    ln -s /root/.bun/bin/bunx /usr/local/bin/bunx

# Copy monorepo configuration for dependency resolution
COPY buf.yaml package.json bunfig.toml bun.lock turbo.json ./
COPY packages/tsconfig.base.json ./packages/

# Copy workspace package.json files for dependency resolution
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/generated/package.json ./packages/generated/
COPY packages/utils/package.json ./packages/utils/
COPY packages/metrics-discovery/package.json ./packages/metrics-discovery/
COPY packages/prettier-config/package.json ./packages/prettier-config/
COPY packages/proto/package.json ./packages/proto/
COPY packages/web3/package.json ./packages/web3/
COPY protocol/package.json ./protocol/

# Install dependencies (prepare.js will install Foundry if needed)
RUN bun install && bun pm cache rm

# Copy remaining source code
COPY packages/contracts ./packages/contracts/
COPY packages/generated ./packages/generated/
COPY packages/utils ./packages/utils/
COPY packages/metrics-discovery ./packages/metrics-discovery/
COPY packages/prettier-config ./packages/prettier-config/
COPY packages/proto ./packages/proto/
COPY packages/web3 ./packages/web3/
COPY protocol ./protocol/

# Build the package
RUN bun run turbo build --filter @towns-protocol/metrics-discovery

# Create runtime image
FROM oven/bun:1.3-alpine AS runtime

WORKDIR /river/packages/metrics-discovery

# Install runtime dependencies
RUN apk add --no-cache curl

COPY --from=builder /river/packages/metrics-discovery ./

# Expose the service port
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD curl -f http://localhost:8080 || exit 1

CMD ["bun", "./dist/index.cjs"]
