# Type Alias: RetryParams

```ts
type RetryParams = object;
```

Defined in: [packages/sdk/src/rpcInterceptors.ts:23](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/rpcInterceptors.ts#L23)

## Properties

### defaultTimeoutMs

```ts
defaultTimeoutMs: number;
```

Defined in: [packages/sdk/src/rpcInterceptors.ts:27](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/rpcInterceptors.ts#L27)

***

### initialRetryDelay

```ts
initialRetryDelay: number;
```

Defined in: [packages/sdk/src/rpcInterceptors.ts:25](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/rpcInterceptors.ts#L25)

***

### maxAttempts

```ts
maxAttempts: number;
```

Defined in: [packages/sdk/src/rpcInterceptors.ts:24](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/rpcInterceptors.ts#L24)

***

### maxRetryDelay

```ts
maxRetryDelay: number;
```

Defined in: [packages/sdk/src/rpcInterceptors.ts:26](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/rpcInterceptors.ts#L26)

***

### refreshNodeUrl()?

```ts
optional refreshNodeUrl: () => Promise<string>;
```

Defined in: [packages/sdk/src/rpcInterceptors.ts:28](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/rpcInterceptors.ts#L28)

#### Returns

`Promise`\<`string`\>
