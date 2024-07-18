FROM node:20-alpine

WORKDIR /monorepo

RUN apk add --no-cache python3 py3-pip make build-base git bash

COPY . .

WORKDIR /monorepo/servers/notification-service

RUN yarn install 
RUN yarn build:turbo

EXPOSE 80

CMD ["./scripts/run.sh"]
