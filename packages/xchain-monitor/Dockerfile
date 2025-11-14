FROM ubuntu:24.04 AS builder

WORKDIR /river

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git curl ca-certificates build-essential && \
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
COPY ./packages/xchain-monitor/package.json ./packages/xchain-monitor/
COPY ./packages/generated/package.json ./packages/generated/
COPY ./packages/contracts/package.json ./packages/contracts/
COPY ./packages/web3/package.json ./packages/web3/
COPY ./packages/utils/package.json ./packages/utils/
COPY ./packages/proto/package.json ./packages/proto/
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
COPY ./packages/web3 ./packages/web3
COPY ./packages/utils ./packages/utils
COPY ./packages/xchain-monitor ./packages/xchain-monitor

RUN yarn run turbo build --filter @towns-protocol/xchain-monitor...

# create runner image with only the necessary files
FROM node:lts-alpine3.20 AS runner

COPY --from=builder /river/packages/xchain-monitor/dist /river/packages/xchain-monitor/dist

# install dd-trace again (because the bundler excludes some of the sub-dependencies)
WORKDIR /river/packages/xchain-monitor
RUN yarn init --yes
RUN yarn add dd-trace@^5.19.0 && yarn cache clean

# run the service
ARG GIT_SHA

ENV DD_GIT_REPOSITORY_URL="https://github.com/towns-protocol/towns" \
    DD_GIT_COMMIT_SHA=${GIT_SHA} \
    NODE_ENV=production

CMD ["node", "--enable-source-maps", "--max-old-space-size=4096", "./dist/node_esbuild.cjs"]
