# Notification Service

This is a Node.js service that handles notifications.

## Starting the development server

### Docker Compose

`$ docker compose up -d --remove-orphans`

### Yarn

- `$ docker compose up -d db` - first run the database with Docker
- `$ yarn dev` - then run the server with Yarn

### VS Code

- Open VS Code in this path `./server/notificaiton-service`
- Select the `launch notification service` from the Run and Debug in the Activity Bar on the side of VS Code

## Test

- `$ yarn test`

## Manage the database

[Prisma](https://www.prisma.io/docs) is used to manage the database.

- [Prisma Client](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/generating-prisma-client) is an auto-generated database client that's tailored to our database schema, to create run: `$ npx prisma generate`.

- To [generete the migration](https://www.prisma.io/docs/orm/reference/prisma-cli-reference#prisma-migrate) after changing `schema.prisma`, run: `$ npx prisma migrate dev --name $replace_name_here`
