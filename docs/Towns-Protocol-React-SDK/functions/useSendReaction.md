# Function: useSendReaction()

```ts
function useSendReaction(streamId, config?): object;
```

Defined in: [react-sdk/src/useSendReaction.ts:25](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useSendReaction.ts#L25)

Hook to send a reaction to a message in a stream.

Reaction can be any string value, including emojis.

## Parameters

### streamId

`string`

The id of the stream to send the reaction to.

### config?

`ActionConfig`\<(`refEventId`, `reaction`) => `Promise`\<\{
  `eventId`: `string`;
\}\>\>

Configuration options for the action.

## Returns

The `sendReaction` action and its loading state.

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

### sendReaction()

```ts
sendReaction: (...args) => Promise<{
  eventId: string;
}>;
```

#### Parameters

##### args

...\[`string`, `string`\]

#### Returns

`Promise`\<\{
  `eventId`: `string`;
\}\>

## Example

```ts
import { useSendReaction } from '@towns-protocol/react-sdk'

const { sendReaction } = useSendReaction('stream-id')
sendReaction(messageEventId, '🔥')
```
