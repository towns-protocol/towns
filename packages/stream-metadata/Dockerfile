FROM oven/bun:1.2-alpine AS builder

WORKDIR /river

# Install dependencies needed for Sharp and other native modules
RUN apk add --no-cache git curl libc6-compat vips-dev npm

# monorepo root config
COPY buf.yaml package.json bunfig.toml bun.lock turbo.json ./
COPY packages/tsconfig.base.json ./packages/

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
RUN bun install && bun pm cache rm
RUN bun run turbo build --filter @towns-protocol/stream-metadata

# create runner image with only the necessary files
FROM oven/bun:1.2-alpine AS runner

# Install runtime dependencies for Sharp
RUN apk add --no-cache libc6-compat vips

COPY --from=builder /river/packages/stream-metadata/dist /river/packages/stream-metadata/dist

# install external dependencies that were excluded from the bundle
WORKDIR /river/packages/stream-metadata

# Bun is already installed in the base image
RUN bun init --yes

# We need to install @towns-protocol/olm here because esbuild
# isnt smart enough to read the export field in package json
# and get the node specific import in the bundle step
RUN bun add dd-trace@^5.19.0 @towns-protocol/olm@3.2.28 sharp@0.34.3

# Clean bun cache to reduce image size
RUN bun pm cache rm

# run the service
ARG GIT_SHA

ENV DD_GIT_REPOSITORY_URL="https://github.com/towns-protocol/towns" \
    DD_GIT_COMMIT_SHA=${GIT_SHA} \
    NODE_ENV=production

CMD ["bun", "./dist/node_esbuild.cjs"]
