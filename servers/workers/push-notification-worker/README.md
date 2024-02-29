# Development guidelines for the Push Notification Worker

## Pre-requisite: Keys setup

Step 1: Configure the Push Notification Worker
Make sure these keys are configured once:
`cd servers/workers/push-notification-worker && ./scripts/create-vapid-keys.sh`
The keys are generated in `./keys`

`cp servers/workers/push-notification-worker/.dev.vars-sample .dev.vars`
See the instructions in `.dev.vars-sample`

In `.dev.vars`, update the VAPID keys with the generated ones in `./keys`
The AUTH_SECRET should match `VITE_AUTH_WORKER_HEADER_SECRET` in clients/web/app/.env.local

Step 2: Configure the client app
Make sure the VAPID public key is configured once in .env.local.
In `clients/web/app/.env.local`:

- `VITE_WEB_PUSH_APPLICATION_SERVER_KEY`=<VAPID_PUBLIC_KEY>

Step 5: Configure Node and restart
Kill the `Casablanca` task in vscode if it is started.
In `./casablanca/node/run_files/single/config`, update `config.yaml`:

```bash
# Push notification configuration
pushNotification:
    url: 'http://localhost:8787' # URL to the push notification worker. Default empty string disables it.
    authToken: 'AUTH_SECRET_IN_.dev.vars' # auth token for the push notification worker
```

Verify that Push Notification is eneabled in the vscode DEBUG CONSOLE
`INFO 11:28:34.234 PushNotification enabled`

## How to enable Push Notification on the client app

In `clients/web/app/.env.local`:

```bash
VITE_PUSH_NOTIFICATION_ENABLED=true # feature flag: set to true to enable push notifications
```

## How to run the Push Notification Worker

```bash
cd servers/workers/push-notification-worker
./scripts/start-local-push-worker.sh
```

## How to send a test message to the Push Notification Worker

Launch a browser. Visit <http://127.0.0.1:8787/>. Use the UI to send test
notifications.
