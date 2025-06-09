# Function: useRedact()

```ts
function useRedact(streamId, config?): object;
```

Defined in: [react-sdk/src/useRedact.ts:35](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useRedact.ts#L35)

Hook to redact your own message in a channel stream.

## Parameters

### streamId

`string`

The id of the stream to redact the message in.

### config?

`ActionConfig`\<(`eventId`, `reason?`) => `Promise`\<\{
  `eventId`: `string`;
\}\>\>

Configuration options for the action.

## Returns

The `redact` action and its loading state.

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

### redact()

```ts
redact: (...args) => Promise<{
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

### Redact a message

You can use `redact` to redact a message in a stream.
```ts
import { useRedact } from '@towns-protocol/react-sdk'

const { redact } = useRedact(streamId)
redact({ eventId: messageEventId })
```

### Redact a message reaction

You can also use `redact` to redact a message reaction in a stream.
```ts
import { useRedact } from '@towns-protocol/react-sdk'

const { redact } = useRedact(streamId)
redact({ eventId: reactionEventId })
```
