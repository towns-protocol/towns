# Function: connectTownsWithBearerToken()

```ts
function connectTownsWithBearerToken(token, config): Promise<SyncAgent>;
```

Defined in: [react-sdk/src/connectTowns.ts:57](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/connectTowns.ts#L57)

Connect to Towns using a Bearer Token
Towns clients can use this to connect to Towns Protocol on behalf of a user

Useful for server side code, allowing you to persist the signer context and use it to auth with Towns later

## Parameters

### token

`string`

The bearer token to use

### config

`Omit`\<[`SyncAgentConfig`](../../Towns-Protocol-SDK/interfaces/SyncAgentConfig.md), `"context"`\>

The configuration for the sync agent

## Returns

`Promise`\<[`SyncAgent`](../../Towns-Protocol-SDK/classes/SyncAgent.md)\>

The sync agent
