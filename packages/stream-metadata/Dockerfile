FROM node:lts-alpine3.20 as builder

WORKDIR /river

# install binaries
RUN apk add --no-cache git curl bash

# monorepo root config
COPY ./package.json ./package.json
COPY ./.yarn/plugins ./.yarn/plugins
COPY ./.yarn/releases ./.yarn/releases
COPY ./remappings.txt ./remappings.txt
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
COPY ./packages/stream-metadata /river/packages/stream-metadata

# This updates ^workspace references to the actual package version
# which is necessary to pull the correct version from npm
RUN node ./scripts/update-generated-dependents.js && rm -rf ./packages/generated

# install dependencies and build
RUN corepack enable
RUN yarn install
RUN SKIP_BUILD_CONTRACT_TYPES=true yarn run turbo build --filter @river-build/stream-metadata

# create runner image with only the necessary files
FROM node:lts-alpine3.20 as runner
COPY --from=builder /river/packages/stream-metadata/dist /river/packages/stream-metadata/dist

# install dd-trace again (because the bundler excludes some of the sub-dependencies)
WORKDIR /river/packages/stream-metadata
RUN yarn init --yes
RUN yarn add dd-trace@^5.19.0

# run the service
ARG GIT_SHA

ENV DD_GIT_REPOSITORY_URL="https://github.com/river-build/river" \
  DD_GIT_COMMIT_SHA=${GIT_SHA} \
  NODE_ENV=production

CMD ["node", "--enable-source-maps", "./dist/node_esbuild.cjs"]
