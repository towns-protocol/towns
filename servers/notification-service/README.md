# Notification Service

This is a Node.js service that handles notifications.

## Starting the development server

### Option 1: Launch all the services from command

```bash
# from harmony project root
./scripts/start-local-notification-service.sh
```

### Option 2: Launch all the services within VS Code

```bash
cmd+shift+P
delete the '>' prompt
type 'task start local dev'
```

### Setting env.local for the app and the Notification Service

#### Notification Service's .env.local

```bash
# enable/disable notification sync
NOTIFICATION_SYNC_ENABLED=false
```

#### Client's .env.local

Copy the value of `PUBLIC_KEY` in ./keys/vapid-keys.json to
`harmony/clients/web/app/.env.local`

```bash
VITE_WEB_PUSH_APPLICATION_SERVER_KEY=your_public_key
```

## Debugging the Notification Service (NS) in VS Code

The running instance of the Notification Service needs to be killed before you
can debug it in VS Code.

### Kill the NS if Option 1 was used

```bash
ctrl+b w
Arrow key to go to 'worker_push' pane
Enter to select pane
ctrl+c to kill the instance
```

### Kill the NS if Option 2 was used

```bash
Find the pane 'NotificationService'
Click the trash can icon to kill it
```

### Debugging in VS Code

- Open VS Code in this path `servers/notification-service`
- Select the `launch notification service` from the Run and Debug in the Activity Bar on the side of VS Code

## Test

- `$ yarn test`

## Manage the database

[Prisma](https://www.prisma.io/docs) is used to manage the database.

- [Prisma Client](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/generating-prisma-client) is an auto-generated database client that's tailored to our database schema, to create run: `$ npx prisma generate`.

- To [generete the migration](https://www.prisma.io/docs/orm/reference/prisma-cli-reference#prisma-migrate) after changing `schema.prisma`, run: `$ yarn db:create-migration:local "migration_description"`
