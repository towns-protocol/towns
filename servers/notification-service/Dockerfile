# Stage 1: Base stage
FROM node:20-alpine AS base

WORKDIR /monorepo

RUN apk add --no-cache python3 py3-pip make build-base git bash

COPY . .

# Install dependencies with Yarn v2
RUN yarn install

RUN yarn notification-service:build

# Stage 2: Final stage
FROM node:20-alpine

WORKDIR /monorepo/servers/notification-service

RUN apk add --no-cache bash

# Copy only the necessary runtime files from the base stage
COPY --from=base /monorepo/servers/notification-service/scripts /monorepo/servers/notification-service/scripts
COPY --from=base /monorepo/servers/notification-service/dist /monorepo/servers/notification-service/dist
COPY --from=base /monorepo/servers/notification-service/package.json /monorepo/servers/notification-service/package.json
COPY --from=base /monorepo/node_modules /monorepo/node_modules
COPY --from=base /monorepo/.yarnrc.yml /monorepo/.yarnrc.yml
COPY --from=base /monorepo/.yarn /monorepo/.yarn

# Ensure the scripts have execution permission
RUN chmod +x /monorepo/servers/notification-service/scripts/run.sh

EXPOSE 80

CMD ["./scripts/run.sh"]
