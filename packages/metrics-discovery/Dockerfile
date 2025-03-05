FROM node:lts-alpine3.20

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
COPY ./packages/generated /river/packages/generated
COPY ./packages/web3 /river/packages/web3
COPY ./packages/dlog /river/packages/dlog
COPY ./packages/proto /river/packages/proto
COPY ./packages/metrics-discovery /river/packages/metrics-discovery


# This updates ^workspace references to the actual package version
# which is necessary to pull the correct version from npm
RUN node ./scripts/update-generated-dependents.js && rm -rf ./packages/generated

# install dependencies and build
RUN corepack enable
RUN yarn install
RUN SKIP_BUILD_CONTRACT_TYPES=true yarn run turbo build --filter @river-build/metrics-discovery

WORKDIR /river/packages/metrics-discovery

HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD curl -f http://localhost:8080 || exit 1

CMD [ "yarn", "start"]
