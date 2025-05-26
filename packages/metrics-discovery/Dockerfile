# TODO: check if this works. Claude 4 yolo'ed it.

# Build stage with Bun for package management
FROM oven/bun:1 AS builder

WORKDIR /river

# Copy monorepo root config
COPY ./package.json ./package.json
COPY ./buf.yaml ./buf.yaml
COPY ./lerna.json ./lerna.json
COPY ./bun.lock ./bun.lock
COPY ./turbo.json ./turbo.json
COPY ./packages/tsconfig.base.json ./packages/tsconfig.base.json

# Copy monorepo core dependencies
COPY ./protocol ./protocol
COPY ./scripts ./scripts

# Copy monorepo packages
COPY ./packages/generated ./packages/generated
COPY ./packages/web3 ./packages/web3
COPY ./packages/dlog ./packages/dlog
COPY ./packages/proto ./packages/proto
COPY ./packages/metrics-discovery ./packages/metrics-discovery

# Install dependencies and build using Bun
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
RUN bun install --frozen-lockfile
RUN bunx turbo build --filter @towns-protocol/metrics-discovery

# Runtime stage with Node.js
FROM node:lts-alpine3.20 AS runtime

WORKDIR /river/packages/metrics-discovery

# Install curl for health check
RUN apk add --no-cache curl

# Copy built application and necessary files from builder stage
COPY --from=builder /river/packages/metrics-discovery/dist ./dist
COPY --from=builder /river/packages/metrics-discovery/package.json ./package.json

# Copy built dependencies that might be needed at runtime
COPY --from=builder /river/packages/generated ./packages/generated
COPY --from=builder /river/packages/web3 ./packages/web3
COPY --from=builder /river/packages/dlog ./packages/dlog
COPY --from=builder /river/packages/proto ./packages/proto

# Copy root package.json and node_modules for workspace dependencies
COPY --from=builder /river/package.json /river/package.json
COPY --from=builder /river/node_modules /river/node_modules

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD curl -f http://localhost:8080 || exit 1

# Expose port
EXPOSE 8080

# Run with Node.js as specified in package.json
CMD ["node", "./dist/index.cjs"]
