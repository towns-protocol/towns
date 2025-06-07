# Function: checkNever()

```ts
function checkNever(value, message?): never;
```

Defined in: [packages/web3/src/utils/ut.ts:85](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/utils/ut.ts#L85)

Use this function in the default case of a exhaustive switch statement to ensure that all cases are handled.
Always throws JSON RPC error.

## Parameters

### value

`never`

Switch value

### message?

`string`

Error message

## Returns

`never`
