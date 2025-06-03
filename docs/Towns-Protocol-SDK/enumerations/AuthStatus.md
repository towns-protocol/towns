# Enumeration: AuthStatus

Defined in: [packages/sdk/src/sync-agent/river-connection/models/authStatus.ts:1](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/models/authStatus.ts#L1)

## Enumeration Members

### ConnectedToRiver

```ts
ConnectedToRiver: "ConnectedToRiver";
```

Defined in: [packages/sdk/src/sync-agent/river-connection/models/authStatus.ts:12](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/models/authStatus.ts#L12)

***

### ConnectingToRiver

```ts
ConnectingToRiver: "ConnectingToRiver";
```

Defined in: [packages/sdk/src/sync-agent/river-connection/models/authStatus.ts:11](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/models/authStatus.ts#L11)

User authenticated with a valid credential and with an active river river client.

***

### Credentialed

```ts
Credentialed: "Credentialed";
```

Defined in: [packages/sdk/src/sync-agent/river-connection/models/authStatus.ts:9](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/models/authStatus.ts#L9)

User authenticated with a valid credential but without an active river stream client.

***

### Disconnected

```ts
Disconnected: "Disconnected";
```

Defined in: [packages/sdk/src/sync-agent/river-connection/models/authStatus.ts:14](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/models/authStatus.ts#L14)

Disconnected, client was stopped

***

### Error

```ts
Error: "Error";
```

Defined in: [packages/sdk/src/sync-agent/river-connection/models/authStatus.ts:16](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/models/authStatus.ts#L16)

Error state: User failed to authenticate or connect to river client.

***

### EvaluatingCredentials

```ts
EvaluatingCredentials: "EvaluatingCredentials";
```

Defined in: [packages/sdk/src/sync-agent/river-connection/models/authStatus.ts:7](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/models/authStatus.ts#L7)

Transition state: None -\> EvaluatingCredentials -\> [Credentialed OR ConnectedToRiver]
 if a river user is found, will connect to river client, otherwise will just validate credentials.

***

### Initializing

```ts
Initializing: "Initializing";
```

Defined in: [packages/sdk/src/sync-agent/river-connection/models/authStatus.ts:3](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/models/authStatus.ts#L3)

Fetching river urls.
