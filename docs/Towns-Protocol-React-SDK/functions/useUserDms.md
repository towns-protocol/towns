# Function: useUserDms()

```ts
function useUserDms(config?): object;
```

Defined in: [react-sdk/src/useUserDms.ts:35](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useUserDms.ts#L35)

Hook to get the direct messages of the current user.

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

The list of all direct messages stream ids of the current user.

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

You can combine this hook with the `useDm`, `useMemberList` and `useMember` hooks to get all direct messages of the current user and render them, showing the name of the other user in the dm:

```tsx
import { useDm, useMyMember, useMemberList, useMember } from '@towns-protocol/react-sdk'

const AllDms = () => {
    const { streamIds } = useUserDms()
    return <>{streamIds.map((streamId) => <Dm key={streamId} streamId={streamId} />)}</>
}

const Dm = ({ streamId }: { streamId: string }) => {
    const { data: dm } = useDm(streamId)
    const { userId: myUserId } = useMyMember(streamId)
    const { data: members } = useMemberList(streamId)
    const { userId, username, displayName } = useMember({
       streamId,
       // We find the other user in the dm by checking the userIds in the member list
       // and defaulting to the current user if we don't find one, since a user is able to send a dm to themselves
       userId: members.userIds.find((userId) => userId !== sync.userId) || sync.userId,
    })
    return <span>{userId === myUserId ? 'You' : displayName || username || userId}</span>
}
```
