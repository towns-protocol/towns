# Notification Service

This is a Node.js service that handles notifications.

## Starting the development server

Run with docker compose: `$ docker-compose up --remove-orphans`

## Test

- `$ yarn test`

## Manage the database

[Prisma](https://www.prisma.io/docs) is used to manage the database.

To [generete the migration](https://www.prisma.io/docs/orm/reference/prisma-cli-reference#prisma-migrate) after changing `schema.prisma`, run:
`$ npx prisma migrate dev --name $replace_name_here`
