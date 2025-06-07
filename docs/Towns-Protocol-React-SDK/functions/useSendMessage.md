# Function: useSendMessage()

```ts
function useSendMessage(streamId, config?): object;
```

Defined in: [react-sdk/src/useSendMessage.ts:15](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useSendMessage.ts#L15)

Hook to send a message to a stream. Can be used to send a message to a channel or a dm/group dm.

## Parameters

### streamId

`string`

The id of the stream to send the message to.

### config?

`ActionConfig`\<(`message`, `options?`) => `Promise`\<\{
  `eventId`: `string`;
\}\>\>

Configuration options for the action.

## Returns

The sendMessage action and the status of the action.

### data

```ts
data: 
  | undefined
  | {
  eventId: string;
};
```

The data returned by the action.

### error

```ts
error: undefined | Error;
```

The error that occurred while executing the action.

### isError

```ts
isError: boolean;
```

Whether the action is in error.

### isPending

```ts
isPending: boolean;
```

Whether the action is pending.

### isSuccess

```ts
isSuccess: boolean;
```

Whether the action is successful.

### sendMessage()

```ts
sendMessage: (...args) => Promise<{
  eventId: string;
}>;
```

Sends a message to the stream.

#### Parameters

##### args

...\[`string`, `object`\]

#### Returns

`Promise`\<\{
  `eventId`: `string`;
\}\>

The event id of the message.
