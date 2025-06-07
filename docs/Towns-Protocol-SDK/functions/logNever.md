# Function: logNever()

```ts
function logNever(value, message?): void;
```

Defined in: [packages/sdk/src/check.ts:34](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/check.ts#L34)

Use this function in the default case of a exhaustive switch statement to ensure that all cases are handled,
but you don't want to throw an error.
Typical place you wouldn't want to throw an error - when parsing a protobuf message on the client. The protocol may
have been updated on the server, but the client hasn't been updated yet. In this case, the client will receive a case
that they can't handle, but it shouldn't break other messages in the stream. If you throw in the middle of a loop processing events,
then lots of messages will appear lost, when you could have just gracefully handled a new case.

## Parameters

### value

`never`

Switch value

### message?

`string`

Error message

## Returns

`void`
