FROM node:lts-alpine3.20 as builder

WORKDIR /river

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
COPY ./packages/eslint-config /river/packages/eslint-config
COPY ./packages/prettier-config /river/packages/prettier-config
COPY ./packages/generated /river/packages/generated
COPY ./packages/web3 /river/packages/web3
COPY ./packages/dlog /river/packages/dlog
COPY ./packages/proto /river/packages/proto
COPY ./packages/sdk /river/packages/sdk
COPY ./packages/encryption /river/packages/encryption
COPY ./apps/stream-metadata /river/apps/stream-metadata

# install dependencies and build
RUN apk add --no-cache git curl
RUN corepack enable
RUN yarn install
RUN yarn run turbo build --filter @towns-protocol/stream-metadata

# create runner image with only the necessary files
FROM node:lts-alpine3.20 as runner
COPY --from=builder /river/apps/stream-metadata/dist /river/apps/stream-metadata/dist

# install dd-trace again (because the bundler excludes some of the sub-dependencies)
WORKDIR /river/apps/stream-metadata
RUN yarn init --yes
RUN yarn add dd-trace@^5.19.0

# run the service
ARG GIT_SHA

ENV DD_GIT_REPOSITORY_URL="https://github.com/towns-protocol/towns" \
    DD_GIT_COMMIT_SHA=${GIT_SHA} \
    NODE_ENV=production

CMD ["node", "--enable-source-maps", "./dist/node_esbuild.cjs"]
