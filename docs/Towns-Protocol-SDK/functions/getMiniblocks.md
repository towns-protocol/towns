# Function: getMiniblocks()

```ts
function getMiniblocks(
   client, 
   streamId, 
   fromInclusive, 
   toExclusive, 
   omitSnapshots, 
   unpackEnvelopeOpts): Promise<{
  miniblocks: ParsedMiniblock[];
  snapshots?: Record<string, Snapshot>;
  terminus: boolean;
}>;
```

Defined in: [packages/sdk/src/makeStreamRpcClient.ts:76](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/makeStreamRpcClient.ts#L76)

## Parameters

### client

[`StreamRpcClient`](../type-aliases/StreamRpcClient.md)

### streamId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

### fromInclusive

`bigint`

### toExclusive

`bigint`

### omitSnapshots

`boolean`

### unpackEnvelopeOpts

`undefined` | [`UnpackEnvelopeOpts`](../interfaces/UnpackEnvelopeOpts.md)

## Returns

`Promise`\<\{
  `miniblocks`: [`ParsedMiniblock`](../interfaces/ParsedMiniblock.md)[];
  `snapshots?`: `Record`\<`string`, `Snapshot`\>;
  `terminus`: `boolean`;
\}\>
