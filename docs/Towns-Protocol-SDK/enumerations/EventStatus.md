# Enumeration: EventStatus

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:22](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L22)

## Enumeration Members

### CANCELLED

```ts
CANCELLED: "cancelled";
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:34](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L34)

The event was cancelled before it was successfully sent.

***

### ENCRYPTING

```ts
ENCRYPTING: "encrypting";
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:26](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L26)

The message is being encrypted

***

### NOT\_SENT

```ts
NOT_SENT: "not_sent";
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:24](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L24)

The event was not sent and will no longer be retried.

***

### QUEUED

```ts
QUEUED: "queued";
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:30](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L30)

The event is in a queue waiting to be sent.

***

### RECEIVED

```ts
RECEIVED: "received";
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:36](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L36)

We received this event

***

### SENDING

```ts
SENDING: "sending";
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:28](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L28)

The event is in the process of being sent.

***

### SENT

```ts
SENT: "sent";
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:32](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L32)

The event has been sent to the server, but we have not yet received the echo.
