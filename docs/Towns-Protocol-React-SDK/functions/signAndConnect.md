# Function: signAndConnect()

```ts
function signAndConnect(signer, config): Promise<SyncAgent>;
```

Defined in: [react-sdk/src/connectTowns.ts:24](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/connectTowns.ts#L24)

Sign and connect to Towns using a Signer and a random delegate wallet every time

## Parameters

### signer

`Signer`

The signer to use

### config

`Omit`\<[`SyncAgentConfig`](../../Towns-Protocol-SDK/interfaces/SyncAgentConfig.md), `"context"`\>

The configuration for the sync agent

## Returns

`Promise`\<[`SyncAgent`](../../Towns-Protocol-SDK/classes/SyncAgent.md)\>

The sync agent
