FROM node:18-alpine

WORKDIR /monorepo

COPY . .

WORKDIR /monorepo/servers/notification-service

RUN yarn install && yarn prisma generate && yarn build

EXPOSE 80

CMD ["./scripts/run.sh"]
