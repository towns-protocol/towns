# Notification Service

This is a Node.js service that handles notifications.

## Env for local development

Copy the `.env.local-sample` as `.env.local`
`$ cd servers/notification-service && cp .env.local-sample .env.local`

Create VAPID public and private keys by running this script:
`$ ./scripts/create-vapid-keys.sh`

Keys are in `.keys/vapid-keys.json`, set the `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in your `.env.local`

## Starting the development server

### Docker Compose

`$ docker compose up -d --remove-orphans`

### Yarn

- `$ docker compose up -d db` - first run the database with Docker
- `$ yarn dev` - then run the server with Yarn

### VS Code

- Open VS Code in this path `servers/notification-service`
- Select the `launch notification service` from the Run and Debug in the Activity Bar on the side of VS Code

## Test

- `$ yarn test`

## Manage the database

[Prisma](https://www.prisma.io/docs) is used to manage the database.

- [Prisma Client](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/generating-prisma-client) is an auto-generated database client that's tailored to our database schema, to create run: `$ npx prisma generate`.

- To [generete the migration](https://www.prisma.io/docs/orm/reference/prisma-cli-reference#prisma-migrate) after changing `schema.prisma`, run: `$ npx prisma migrate dev --name $replace_name_here`
