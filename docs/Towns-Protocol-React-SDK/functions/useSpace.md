# Function: useSpace()

```ts
function useSpace(spaceId, config?): ObservableValue<SpaceModel>;
```

Defined in: [react-sdk/src/useSpace.ts:26](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useSpace.ts#L26)

Hook to get data about a space.
You can use this hook to get space metadata and ids of channels in the space.

## Parameters

### spaceId

`string`

The id of the space to get data about.

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

[`ObservableValue`](../type-aliases/ObservableValue.md)\<[`SpaceModel`](../../Towns-Protocol-SDK/interfaces/SpaceModel.md)\>

The SpaceModel data.

## Example

You can use this hook to display the data about a space:

```tsx
import { useSpace } from '@towns-protocol/react-sdk'

const Space = ({ spaceId }: { spaceId: string }) => {
    const { data: space } = useSpace(spaceId)
    return <div>{space.metadata?.name || 'Unnamed Space'}</div>
}
```
