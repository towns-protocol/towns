# Function: useUserGdms()

```ts
function useUserGdms(config?): object;
```

Defined in: [react-sdk/src/useUserGdms.ts:26](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useUserGdms.ts#L26)

Hook to get the group dm streams of the current user.

## Parameters

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

The list of all group dm stream ids of the current user.

### error

```ts
error: undefined | Error;
```

If the model is in an error state, this will be the error.

### isError

```ts
isError: boolean;
```

True if the model is in an error state.

### isLoaded

```ts
isLoaded: boolean;
```

True if the data is loaded.

### isLoading

```ts
isLoading: boolean;
```

True if the model is in a loading state.

### status

```ts
status: "error" | "loading" | "loaded";
```

The status of the model.

### streamIds

```ts
streamIds: string[] = data.streamIds;
```

## Example

You can combine this hook with the `useGdm` hook to get all group dm streams of the current user and render them:

```tsx
import { useUserGdms, useGdm } from '@towns-protocol/react-sdk'

const AllGdms = () => {
    const { streamIds } = useUserGdms()
    return <>{streamIds.map((streamId) => <Gdm key={streamId} streamId={streamId} />)}</>
}

const Gdm = ({ streamId }: { streamId: string }) => {
    const { data: gdm } = useGdm(streamId)
    return <div>{gdm.metadata?.name || 'Unnamed Gdm'}</div>
}
```
