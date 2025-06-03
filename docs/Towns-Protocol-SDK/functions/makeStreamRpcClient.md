# Function: makeStreamRpcClient()

```ts
function makeStreamRpcClient(
   dest, 
   refreshNodeUrl?, 
   opts?): StreamRpcClient;
```

Defined in: [packages/sdk/src/makeStreamRpcClient.ts:30](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/makeStreamRpcClient.ts#L30)

## Parameters

### dest

`string`

### refreshNodeUrl?

() => `Promise`\<`string`\>

### opts?

[`RpcOptions`](../interfaces/RpcOptions.md)

## Returns

[`StreamRpcClient`](../type-aliases/StreamRpcClient.md)
