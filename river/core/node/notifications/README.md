# Notification Service

## Overview

The **Notification Service** allows users to configure personal notification preferences and tracks events across
Direct Messages (DM), Group Direct Messages (GDM), and Space channels. The service sends web push and/or APN
notifications for events in these channels based on user-defined settings.

## Key Features

- **Personalized Notification Preferences:** Users can define their notification settings.
- **Multi-Channel Support:** Supports notifications for DM, GDM, and Space channels.
- **Authentication:** Session management using JWT session tokens.

## External Interfaces

The Notification Service offers/needs several external components:

- **API:** Allows users to configure their notification preferences.
- **Database:** Stores notification-related preferences.
- **Metrics:** Provides insights into service status and activity.
- **Logging:** Uses the same logging architecture as the River stream and xchain node.

## Client API

The Notification Service exposes a **gRPC-based** Client API with two key services:

### 1. **Authentication Service**

- **Purpose:** Allows users to generate a JWT session token required for accessing the User Settings API.
- **Flow:**
  1. Request a challenge.
  2. Sign the challenge.
  3. Use the signed challenge to obtain a session token.

A session token is a JWT with the following claims:

- `sub`: user ID
- `aud`: set to `ns` (Notification Service)
- `iss`: set to `ns`
- `exp`: expiration timestamp

### 2. **User Settings API**

- **Purpose:** Allows users to set and manage their notification preferences.
- **Authentication:** Every request requires a valid session token passed through the request `Authorization` header.
  - If the token is missing or invalid, the service returns `Err_UNAUTHENTICATED` (code=16).

## Running the Service

To run the Notification Service, use the `notifications` subcommand within the River node. The service listens to streams from the stream registry contract and starts tracking relevant streams. When a sync session is disrupted (e.g., due to a node restart), the service will periodically attempt to restart the sync session.

### Example Command

From the `core` directory in the project run the notification service against alpha with:

```bash
$ ./env/alpha/run.sh notifications
```

Additional configuration can be supplied through the `-c <config-file>` argument.

## Metrics

The Notification Service exports the following **Prometheus** metrics:

- **`river_notification_total_streams`**: Total number of streams that need to be tracked.

  - Labels: `type=[dm, gdm, space_channel, user_settings]`

- **`river_notification_tracked_streams`**: Number of streams currently being tracked.

  - Labels: `type=[dm, gdm, space_channel, user_settings]`

- **`river_notification_sync_down`**: Number of streams reported as down by remote.

- **`river_notification_sync_ping`**: Number of ping requests sent, grouped by status (`failure`, `success`).

- **`river_notification_sync_pong`**: Number of pong responses received.

- **`river_notification_sync_sessions_active`**: Number of active sync sessions.

- **`river_notification_sync_update`**: Number of stream updates received, grouped by `reset=[true, false]`.

- **`river_notification_stream_session_inflight`**: Number of `SyncStreams` requests that haven't received a response yet.

- **`river_notification_stream_ping_inflight`**: Number of ping requests that haven't received a response yet.

- **`river_notification_webpush_send`**: Number of WebPush notifications sent, grouped by result (`success`, `failure`).

- **`river_notification_apn_send`**: Number of APN notifications sent, grouped by result (`success`, `failure`).

## Configuration

The Notification Service is configured using the same settings as the River node but also includes notification-specific options. Below are the key configuration options:

### Client API Authentication

- **`notifications.simulate`**: If set to `true`, the service will log events without actually sending notifications. APN and WebPush settings are not required when simulation is enabled.
- **`notifications.subscriptionExpirationDuration`**: Defines how long to continue sending notifications to a device that has not received any updates in the past `subscription_expiration_duration` (default: 90 days).
- **`notifications.authentication.sessionToken.lifetime`**: Specifies the lifetime of a session token (default: 30 minutes).
- **`notifications.authentication.sessionToken.key.algorithm`**: Currently, only `HS256` is supported.
- **`notifications.authentication.sessionToken.key.key`**: 256-bit random key (in hexadecimal format, no `0x` prefix).

**Generate the `sessionToken.key.key`:**

```bash
$ openssl rand -hex 32
bec97df03d2c3515aa2a5eb87ee1834838186a5f08fa88558667bcdd0d2dde01
```

### Push Notification Settings

#### Apple Push Notifications (APN):

- **`notifications.apn.appBundleId`**
- **`notifications.apn.expiration`**
- **`notifications.apn.keyId`**
- **`notifications.apn.teamId`**
- **`notifications.apn.authKey`**

#### WebPush VAPID Settings:

- **`notifications.webpush.vapid.privateKey`**
- **`notifications.webpush.vapid.authKey`**
- **`notifications.webpush.vapid.publicKey`**
- **`notifications.webpush.vapid.subject`**
