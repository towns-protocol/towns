# Function: makeRiverConfig()

```ts
function makeRiverConfig(inEnvironmentId?): object;
```

Defined in: [packages/sdk/src/riverConfig.ts:123](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/riverConfig.ts#L123)

## Parameters

### inEnvironmentId?

`string`

## Returns

`object`

### base

```ts
base: object;
```

#### base.chainConfig

```ts
base.chainConfig: BaseChainConfig = env.base;
```

#### base.rpcUrl

```ts
base.rpcUrl: string;
```

### environmentId

```ts
environmentId: string;
```

### river

```ts
river: object;
```

#### river.chainConfig

```ts
river.chainConfig: RiverChainConfig = env.river;
```

#### river.rpcUrl

```ts
river.rpcUrl: string;
```
