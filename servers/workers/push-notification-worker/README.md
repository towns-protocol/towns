# Development guidelines for the Push Notification Worker

## Pre-requisite: Keys setup

Step 1: `cd servers/workers/push-notification-worker && ./scripts/create-vapid-keys.sh`
The keys are generated in `./keys`

Step 2: `cp servers/workers/push-notification-worker/.dev.vars-sample .dev.vars`
See the instructions in `.dev.vars-sample`

Step 3: In `.dev.vars`, update the VAPID keys with the generated ones in `./keys`

Step 4: In `clients/web/app/.env.local`:

- `VITE_WEB_PUSH_APPLICATION_SERVER_KEY`=<VAPID_PUBLIC_KEY>

## How to enable Push Notification on the client app

In `clients/web/app/.env.local`:

```bash
VITE_MOCK_SERVICE_WORKER_ENABLED=false # set to false to use the real Service Worker for push notifications
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

## How to start Dendrite with Push Notification enabled

### Option 1: Run Dendrite from Terminal

```bash
# from harmony root
./scripts/start-local-dendrite.sh -wpn
```

### Option 2: Run Dendrite from VSCode

, create a `.env` file and set
these env variables in the file:

```bash
export PUSH_NOTIFICATION_AUTH_TOKEN="foo" # same as .dev.vars
export PUSH_NOTIFICATION_URL="http://127.0.0.1:8787" # your push worker URL
```

## How to enable Push Notification on the client
