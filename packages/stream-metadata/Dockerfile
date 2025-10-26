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

# monorepo root config
COPY ./package.json ./package.json
COPY ./.yarn/plugins ./.yarn/plugins
COPY ./.yarn/releases ./.yarn/releases
COPY ./.yarnrc.yml ./.yarnrc.yml
COPY ./buf.yaml ./buf.yaml
COPY ./lerna.json ./lerna.json
COPY ./yarn.lock ./yarn.lock
COPY ./turbo.json ./turbo.json
COPY ./packages/tsconfig.base.json ./packages/tsconfig.base.json

# monorepo core dependencies
COPY ./protocol ./protocol

# monorepo scripts
COPY ./scripts ./scripts

# monorepo packages
COPY ./packages/contracts /river/packages/contracts
COPY ./packages/eslint-config /river/packages/eslint-config
COPY ./packages/prettier-config /river/packages/prettier-config
COPY ./packages/generated /river/packages/generated
COPY ./packages/web3 /river/packages/web3
COPY ./packages/utils /river/packages/utils
COPY ./packages/proto /river/packages/proto
COPY ./packages/sdk /river/packages/sdk
COPY ./packages/encryption /river/packages/encryption
COPY ./packages/sdk-crypto /river/packages/sdk-crypto
COPY ./packages/rpc-connector /river/packages/rpc-connector
COPY ./packages/stream-metadata /river/packages/stream-metadata

# install dependencies and build
RUN corepack enable && \
    corepack prepare yarn@3.8.0 --activate

# Install dependencies
RUN yarn install && yarn cache clean
RUN yarn run turbo build --filter @towns-protocol/stream-metadata

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
