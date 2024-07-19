FROM node:20-alpine

WORKDIR /monorepo

RUN apk add --no-cache python3 py3-pip make build-base git bash

COPY . .

RUN yarn 
RUN yarn notification-service:build

WORKDIR /monorepo/servers/notification-service

EXPOSE 80

CMD ["./scripts/run.sh"]
