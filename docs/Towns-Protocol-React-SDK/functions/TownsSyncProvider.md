# Function: TownsSyncProvider()

```ts
function TownsSyncProvider(props): Element;
```

Defined in: [react-sdk/src/TownsSyncProvider.tsx:18](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/TownsSyncProvider.tsx#L18)

Provides the sync agent to all hooks usage that interacts with the Towns Protocol.

- If you want to interact with the sync agent directly, you can use the `useSyncAgent` hook.
- If you want to interact with the Towns Protocol using hooks provided by this SDK, you should wrap your App with this provider.

You can pass an initial sync agent instance to the provider.
This can be useful for persisting authentication.

## Parameters

### props

The props for the provider

#### children?

`ReactNode`

#### config?

\{
  `onTokenExpired?`: () => `void`;
\}

#### config.onTokenExpired?

() => `void`

A callback function that is called when the bearer token expires.

#### syncAgent?

[`SyncAgent`](../../Towns-Protocol-SDK/classes/SyncAgent.md)

A initial sync agent instance. Useful for persisting authentication.

## Returns

`Element`

The provider
