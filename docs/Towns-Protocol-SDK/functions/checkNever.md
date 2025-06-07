# Function: checkNever()

```ts
function checkNever(
   value, 
   message?, 
   code?, 
   data?): never;
```

Defined in: [packages/sdk/src/check.ts:14](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/check.ts#L14)

Use this function in the default case of a exhaustive switch statement to ensure that all cases are handled.
Always throws JSON RPC error.

## Parameters

### value

`never`

Switch value

### message?

`string`

Error message

### code?

`Err`

JSON RPC error code

### data?

`any`

Optional data to include in the error

## Returns

`never`
