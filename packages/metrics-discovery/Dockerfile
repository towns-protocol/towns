FROM node:lts-alpine3.20 AS builder

WORKDIR /river

# Install build dependencies
RUN apk add --no-cache git curl

# Enable Corepack and install Yarn
RUN corepack enable && \
    corepack prepare yarn@3.8.0 --activate

# Copy monorepo configuration for dependency resolution
COPY buf.yaml package.json yarn.lock .yarnrc.yml turbo.json ./
COPY .yarn/releases .yarn/releases
COPY .yarn/plugins .yarn/plugins
COPY packages/tsconfig.base.json ./packages/

# Copy workspace package.json files for dependency resolution
COPY packages/utils/package.json ./packages/utils/
COPY packages/metrics-discovery/package.json ./packages/metrics-discovery/
COPY packages/prettier-config/package.json ./packages/prettier-config/
COPY packages/proto/package.json ./packages/proto/
COPY packages/web3/package.json ./packages/web3/
COPY protocol/package.json ./protocol/

# Copy packages needed for yarn install (preinstall scripts)
COPY packages/contracts ./packages/contracts/
COPY packages/generated ./packages/generated/

# Install dependencies
RUN yarn install

# Copy remaining source code
COPY packages/utils ./packages/utils/
COPY packages/metrics-discovery ./packages/metrics-discovery/
COPY packages/prettier-config ./packages/prettier-config/
COPY packages/proto ./packages/proto/
COPY packages/web3 ./packages/web3/
COPY protocol ./protocol/

# Build the package
RUN yarn run turbo build --filter @towns-protocol/metrics-discovery

# Create runtime image
FROM node:lts-alpine3.20 AS runtime

WORKDIR /river/packages/metrics-discovery

# Install runtime dependencies
RUN apk add --no-cache curl

COPY --from=builder /river/packages/metrics-discovery ./

# Expose the service port
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD curl -f http://localhost:8080 || exit 1

CMD [ "node", "./dist/index.cjs"]
