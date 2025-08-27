FROM node:lts-alpine3.20 AS builder

WORKDIR /river

# monorepo root config
COPY ./package.json ./package.json
COPY ./pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY ./buf.yaml ./buf.yaml
COPY ./lerna.json ./lerna.json
COPY ./pnpm-lock.yaml ./pnpm-lock.yaml
COPY ./turbo.json ./turbo.json
COPY ./packages/tsconfig.base.json ./packages/tsconfig.base.json

# monorepo core dependencies
COPY ./protocol ./protocol

# monorepo scripts
COPY ./scripts ./scripts

# monorepo packages
COPY ./packages/eslint-config /river/packages/eslint-config
COPY ./packages/prettier-config /river/packages/prettier-config
COPY ./packages/generated /river/packages/generated
COPY ./packages/web3 /river/packages/web3
COPY ./packages/dlog /river/packages/dlog
COPY ./packages/proto /river/packages/proto
COPY ./packages/sdk /river/packages/sdk
COPY ./packages/encryption /river/packages/encryption
COPY ./packages/sdk-crypto /river/packages/sdk-crypto
COPY ./packages/rpc-connector /river/packages/rpc-connector
COPY ./packages/stream-metadata /river/packages/stream-metadata

# install dependencies and build
RUN apk add --no-cache git curl
RUN corepack enable
RUN corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile
RUN pnpm turbo build --filter @towns-protocol/stream-metadata

# create runner image with only the necessary files
FROM node:lts-alpine3.20 AS runner
COPY --from=builder /river/packages/stream-metadata/dist /river/packages/stream-metadata/dist

# install external dependencies that were excluded from the bundle
WORKDIR /river/packages/stream-metadata
RUN corepack prepare pnpm@latest --activate
RUN pnpm init
# We need to install @towns-protocol/olm here because esbuild
# isnt smart enough to read the export field in package json
# and get the node specific import in the bundle step
RUN pnpm add dd-trace@^5.19.0 @towns-protocol/olm@3.2.28

# run the service
ARG GIT_SHA

ENV DD_GIT_REPOSITORY_URL="https://github.com/towns-protocol/towns" \
    DD_GIT_COMMIT_SHA=${GIT_SHA} \
    NODE_ENV=production

CMD ["node", "--enable-source-maps", "./dist/node_esbuild.cjs"]
