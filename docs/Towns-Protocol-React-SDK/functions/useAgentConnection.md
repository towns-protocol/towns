# Function: useAgentConnection()

```ts
function useAgentConnection(): object;
```

Defined in: [react-sdk/src/useAgentConnection.ts:73](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useAgentConnection.ts#L73)

Hook for managing the connection to the sync agent

## Returns

The connection state and methods (connect, connectUsingBearerToken, disconnect)

### connect()

```ts
connect: (signer, config) => Promise<
  | undefined
| SyncAgent>;
```

Connect to Towns Protocol using a Signer

#### Parameters

##### signer

`Signer`

##### config

`AgentConnectConfig`

#### Returns

`Promise`\<
  \| `undefined`
  \| [`SyncAgent`](../../Towns-Protocol-SDK/classes/SyncAgent.md)\>

### connectUsingBearerToken()

```ts
connectUsingBearerToken: (bearerToken, config) => Promise<
  | undefined
| SyncAgent>;
```

Connect to Towns Protocol using a Bearer Token

#### Parameters

##### bearerToken

`string`

##### config

`AgentConnectConfig`

#### Returns

`Promise`\<
  \| `undefined`
  \| [`SyncAgent`](../../Towns-Protocol-SDK/classes/SyncAgent.md)\>

### disconnect()

```ts
disconnect: () => undefined | void;
```

Disconnect from Towns Protocol

#### Returns

`undefined` \| `void`

### env

```ts
env: undefined | string = towns.syncAgent.config.riverConfig.environmentId;
```

The environment of the current connection (gamma, omega, alpha, local_multi, etc.)

### isAgentConnected

```ts
isAgentConnected: boolean;
```

Whether the agent is connected

### isAgentConnecting

```ts
isAgentConnecting: boolean;
```

Whether the agent is currently connecting

## Example

### Bearer Token
```tsx
import { useAgentConnection } from '@towns-protocol/react-sdk'
import { makeRiverConfig } from '@towns-protocol/sdk'
import { useState } from 'react'

const riverConfig = makeRiverConfig('gamma')

const Login = () => {
  const { connectUsingBearerToken, isAgentConnecting, isAgentConnected } = useAgentConnection()
  const [bearerToken, setBearerToken] = useState('')

  return (
    <>
      <input value={bearerToken} onChange={(e) => setBearerToken(e.target.value)} />
      <button onClick={() => connectUsingBearerToken(bearerToken, { riverConfig })}>
        Login
      </button>
      {isAgentConnecting && <span>Connecting... ⏳</span>}
      {isAgentConnected && <span>Connected ✅</span>}
    </>
  )
}
```

### Signer

If you're using Wagmi and Viem, you can use the [`useEthersSigner`](https://wagmi.sh/react/guides/ethers#usage-1) hook to get an ethers.js v5 Signer from a Viem Wallet Client.

```tsx
import { useAgentConnection } from '@towns-protocol/react-sdk'
import { makeRiverConfig } from '@towns-protocol/sdk'
import { useEthersSigner } from './utils/viem-to-ethers'

const riverConfig = makeRiverConfig('gamma')

const Login = () => {
  const { connect, isAgentConnecting, isAgentConnected } = useAgentConnection()
  const signer = useEthersSigner()

  return (
    <>
      <button onClick={async () => {
        if (!signer) {
          return
        }
        connect(signer, { riverConfig })
      }}>
        Login
      </button>
      {isAgentConnecting && <span>Connecting... ⏳</span>}
      {isAgentConnected && <span>Connected ✅</span>}
    </>
  )
}
```
