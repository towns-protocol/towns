FROM ubuntu:24.04 AS builder

WORKDIR /river

# Install dependencies needed for Sharp and other native modules
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git curl ca-certificates build-essential libvips-dev && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Enable Corepack and install Yarn
RUN corepack enable && \
    corepack prepare yarn@3.8.0 --activate

# Copy monorepo configuration for dependency resolution
COPY package.json yarn.lock .yarnrc.yml turbo.json buf.yaml ./
COPY .yarn/releases .yarn/releases
COPY .yarn/plugins .yarn/plugins
COPY packages/tsconfig.base.json ./packages/

# Copy workspace package.json files for dependency resolution
COPY ./packages/stream-metadata/package.json ./packages/stream-metadata/
COPY ./packages/generated/package.json ./packages/generated/
COPY ./packages/contracts/package.json ./packages/contracts/
COPY ./packages/proto/package.json ./packages/proto/
COPY ./packages/sdk/package.json ./packages/sdk/
COPY ./packages/sdk-crypto/package.json ./packages/sdk-crypto/
COPY ./packages/web3/package.json ./packages/web3/
COPY ./packages/utils/package.json ./packages/utils/
COPY ./packages/encryption/package.json ./packages/encryption/
COPY ./packages/rpc-connector/package.json ./packages/rpc-connector/
COPY ./packages/eslint-config/package.json ./packages/eslint-config/
COPY ./packages/prettier-config/package.json ./packages/prettier-config/
COPY ./protocol/package.json ./protocol/

# Install dependencies (cached unless package.json files change)
RUN yarn install && yarn cache clean

# Copy remaining source code (only packages needed for build)
COPY ./protocol ./protocol
COPY ./packages/contracts ./packages/contracts
COPY ./packages/generated ./packages/generated
COPY ./packages/proto ./packages/proto
COPY ./packages/sdk ./packages/sdk
COPY ./packages/sdk-crypto ./packages/sdk-crypto
COPY ./packages/web3 ./packages/web3
COPY ./packages/utils ./packages/utils
COPY ./packages/encryption ./packages/encryption
COPY ./packages/rpc-connector ./packages/rpc-connector
COPY ./packages/stream-metadata ./packages/stream-metadata

RUN yarn run turbo build --filter @towns-protocol/stream-metadata...

# create runner image with only the necessary files
FROM node:lts-alpine3.20 AS runner

# Install runtime dependencies for Sharp
RUN apk add --no-cache libc6-compat vips

COPY --from=builder /river/packages/stream-metadata/dist /river/packages/stream-metadata/dist

# install external dependencies that were excluded from the bundle
WORKDIR /river/packages/stream-metadata
RUN yarn init --yes

# We need to install @towns-protocol/olm here because esbuild
# isnt smart enough to read the export field in package json
# and get the node specific import in the bundle step
RUN yarn add dd-trace@^5.19.0 @towns-protocol/olm@3.2.28 sharp@0.34.3 && yarn cache clean

# Force rebuild sharp to ensure correct Linux binaries and clean cache
RUN yarn remove sharp && yarn add sharp@0.34.3 && yarn cache clean

# run the service
ARG GIT_SHA

ENV DD_GIT_REPOSITORY_URL="https://github.com/towns-protocol/towns" \
    DD_GIT_COMMIT_SHA=${GIT_SHA} \
    NODE_ENV=production

CMD ["node", "--enable-source-maps", "./dist/node_esbuild.cjs"]
