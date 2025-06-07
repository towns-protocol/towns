# Interface: SyncAgentConfig

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:29](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L29)

## Properties

### baseProvider?

```ts
optional baseProvider: Provider;
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:37](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L37)

***

### context

```ts
context: SignerContext;
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:30](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L30)

***

### deviceId?

```ts
optional deviceId: string;
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:34](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L34)

***

### disablePersistenceStore?

```ts
optional disablePersistenceStore: boolean;
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:35](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L35)

***

### encryptionDevice?

```ts
optional encryptionDevice: EncryptionDeviceInitOpts;
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:38](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L38)

***

### highPriorityStreamIds?

```ts
optional highPriorityStreamIds: string[];
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:33](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L33)

***

### logId?

```ts
optional logId: string;
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:41](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L41)

***

### onTokenExpired()?

```ts
optional onTokenExpired: () => void;
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:39](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L39)

#### Returns

`void`

***

### retryParams?

```ts
optional retryParams: RetryParams;
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:32](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L32)

***

### riverConfig

```ts
riverConfig: object;
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:31](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L31)

#### base

```ts
base: object;
```

##### base.chainConfig

```ts
base.chainConfig: BaseChainConfig = env.base;
```

##### base.rpcUrl

```ts
base.rpcUrl: string;
```

#### environmentId

```ts
environmentId: string;
```

#### river

```ts
river: object;
```

##### river.chainConfig

```ts
river.chainConfig: RiverChainConfig = env.river;
```

##### river.rpcUrl

```ts
river.rpcUrl: string;
```

***

### riverProvider?

```ts
optional riverProvider: Provider;
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:36](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L36)

***

### unpackEnvelopeOpts?

```ts
optional unpackEnvelopeOpts: UnpackEnvelopeOpts;
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:40](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L40)
