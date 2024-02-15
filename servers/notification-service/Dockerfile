FROM node:18-alpine

WORKDIR /monorepo

COPY . .

WORKDIR /monorepo/servers/notification-service

RUN yarn && yarn build

RUN yarn prisma generate

EXPOSE 80

CMD ["./scripts/run.sh"]
