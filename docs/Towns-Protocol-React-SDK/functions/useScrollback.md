# Function: useScrollback()

```ts
function useScrollback(streamId, config?): object;
```

Defined in: [react-sdk/src/useScrollback.ts:19](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useScrollback.ts#L19)

Hook to get the scrollback action for a stream.

Scrollback is the action of getting miniblocks from a stream before a certain point in time.
Getting miniblocks means that new events that are possibly new messages, reactions and so on are fetched.

## Parameters

### streamId

`string`

The id of the stream to get the scrollback action for.

### config?

`ActionConfig`\<() => `Promise`\<\{
  `fromInclusiveMiniblockNum`: `bigint`;
  `terminus`: `boolean`;
\}\>\>

Configuration options for the action.

## Returns

The `scrollback` action and its loading state.

### data

```ts
data: 
  | undefined
  | {
  fromInclusiveMiniblockNum: bigint;
  terminus: boolean;
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

### scrollback()

```ts
scrollback: (...args) => Promise<{
  fromInclusiveMiniblockNum: bigint;
  terminus: boolean;
}>;
```

#### Parameters

##### args

...\[\]

#### Returns

`Promise`\<\{
  `fromInclusiveMiniblockNum`: `bigint`;
  `terminus`: `boolean`;
\}\>
