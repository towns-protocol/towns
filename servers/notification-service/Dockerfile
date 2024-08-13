FROM node:20-alpine

WORKDIR /monorepo

RUN apk add --no-cache python3 py3-pip make build-base git bash

COPY . .

RUN yarn 
RUN yarn notification-service:build

WORKDIR /monorepo/servers/notification-service

EXPOSE 80

# Environment variables setup for datadog source linking
ARG GIT_SHA
ARG DD_GIT_REPOSITORY_URL="https://github.com/HereNotThere/harmony/tree/main/servers/notification-service"

ENV DD_GIT_REPOSITORY_URL=${DD_GIT_REPOSITORY_URL} \
    DD_GIT_COMMIT_SHA=${GIT_SHA}

CMD ["./scripts/run.sh"]
