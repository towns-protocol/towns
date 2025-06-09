# Function: getTime()

```ts
function getTime<T>(fn): Promise<{
  result: Awaited<T>;
  time: number;
}>;
```

Defined in: [packages/sdk/src/utils.ts:125](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/utils.ts#L125)

## Type Parameters

### T

`T`

## Parameters

### fn

() => `Promise`\<`T`\>

## Returns

`Promise`\<\{
  `result`: `Awaited`\<`T`\>;
  `time`: `number`;
\}\>
