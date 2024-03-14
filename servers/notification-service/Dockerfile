FROM node:20-alpine

WORKDIR /monorepo

COPY . .

RUN apk add --no-cache python3 py3-pip make build-base git

WORKDIR /monorepo/servers/notification-service

RUN yarn install 
RUN yarn prisma generate
RUN yarn build

EXPOSE 80

CMD ["./scripts/run.sh"]