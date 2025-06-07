# Function: useTimeline()

```ts
function useTimeline(streamId, config?): ObservableValue<TimelineEvent[]>;
```

Defined in: [react-sdk/src/useTimeline.ts:27](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useTimeline.ts#L27)

Hook to get the timeline events from a stream.

You can use the `useTimeline` hook to get the timeline events from a channel stream, dm stream or group dm stream

## Parameters

### streamId

`string`

The id of the stream to get the timeline events from.

### config?

Configuration options for the observable.

#### fireImmediately?

`boolean`

Trigger the update immediately, without waiting for the first update.

**Default Value**

```ts
true
```

#### onError?

(`error`) => `void`

Callback function to be called when an error occurs.

#### onUpdate?

(`data`) => `void`

Callback function to be called when the data is updated.

## Returns

[`ObservableValue`](../type-aliases/ObservableValue.md)\<[`TimelineEvent`](../../Towns-Protocol-SDK/interfaces/TimelineEvent.md)[]\>

The timeline events of the stream as an observable.

## Example

```ts
import { useTimeline } from '@towns-protocol/react-sdk'
import { RiverTimelineEvent } from '@towns-protocol/sdk'

const { data: events } = useTimeline(streamId)

// You can filter the events by their kind
const messages = events.filter((event) => event.content?.kind === RiverTimelineEvent.ChannelMessage)
```
