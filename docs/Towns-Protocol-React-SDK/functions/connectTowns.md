# Function: connectTowns()

```ts
function connectTowns(signerContext, config): Promise<SyncAgent>;
```

Defined in: [react-sdk/src/connectTowns.ts:41](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/connectTowns.ts#L41)

Connect to Towns using a SignerContext

Useful for server side code, allowing you to persist the signer context and use it to auth with Towns later

## Parameters

### signerContext

[`SignerContext`](../../Towns-Protocol-SDK/interfaces/SignerContext.md)

The signer context to use

### config

`Omit`\<[`SyncAgentConfig`](../../Towns-Protocol-SDK/interfaces/SyncAgentConfig.md), `"context"`\>

The configuration for the sync agent

## Returns

`Promise`\<[`SyncAgent`](../../Towns-Protocol-SDK/classes/SyncAgent.md)\>

The sync agent
