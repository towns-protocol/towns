# Function: useUserSpaces()

```ts
function useUserSpaces(config?): object;
```

Defined in: [react-sdk/src/useUserSpaces.ts:26](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useUserSpaces.ts#L26)

Hook to get the spaces of the current user.

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

The list of all space ids of the current user.

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

### spaceIds

```ts
spaceIds: string[] = data.spaceIds;
```

### status

```ts
status: "error" | "loading" | "loaded";
```

The status of the model.

## Example

You can combine this hook with the `useSpace` hook to get all spaces of the current user and render them:

```tsx
import { useUserSpaces, useSpace } from '@towns-protocol/react-sdk'

const AllSpaces = () => {
    const { spaceIds } = useUserSpaces()
    return <>{spaceIds.map((spaceId) => <Space key={spaceId} spaceId={spaceId} />)}</>
}

const Space = ({ spaceId }: { spaceId: string }) => {
    const { data: space } = useSpace(spaceId)
    return <div>{space.metadata?.name || 'Unnamed Space'}</div>
}
```
