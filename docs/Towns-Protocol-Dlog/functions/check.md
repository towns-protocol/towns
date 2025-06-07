# Function: check()

```ts
function check(
   value, 
   message?, 
   code?, 
   data?): asserts value;
```

Defined in: [packages/dlog/src/check.ts:29](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/dlog/src/check.ts#L29)

If not value, throws JSON RPC error with numberic error code, which is transmitted to the client.

## Parameters

### value

`boolean`

The value to check

### message?

`string`

Error message to use if value is not valid

### code?

`Err`

JSON RPC error code to use if value is not valid

### data?

`any`

Optional data to include in the error

## Returns

`asserts value`
