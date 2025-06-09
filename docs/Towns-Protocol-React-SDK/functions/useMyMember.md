# Function: useMyMember()

```ts
function useMyMember(streamId, config?): object;
```

Defined in: [react-sdk/src/useMyMember.ts:16](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useMyMember.ts#L16)

Hook to get the data of the current user in a stream.

## Parameters

### streamId

`string`

The id of the stream to get the current user of.

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

The MemberModel of the current user.

### displayName

```ts
displayName: string;
```

Display name of the member.

### ensAddress?

```ts
optional ensAddress: string;
```

ENS address of the member.
Should not be trusted, as it can be spoofed.
You should be validating it.

### id

```ts
id: string;
```

**`Internal`**

The store id of the member.

### initialized

```ts
initialized: boolean;
```

Whether the SyncAgent has loaded this data.

### isDisplayNameEncrypted?

```ts
optional isDisplayNameEncrypted: boolean;
```

Whether the display name is encrypted.

### isUsernameConfirmed

```ts
isUsernameConfirmed: boolean;
```

Whether the username has been confirmed by the River node.

### isUsernameEncrypted

```ts
isUsernameEncrypted: boolean;
```

Whether the username is encrypted.

### membership?

```ts
optional membership: MembershipOp;
```

MembershipOp of the member.

### nft?

```ts
optional nft: NftModel;
```

[NftModel](../../Towns-Protocol-SDK/type-aliases/NftModel.md) of the member.
Should not be trusted, as it can be spoofed.
You should be validating it.

### streamId

```ts
streamId: string;
```

The id of the stream where the data belongs to.

### userId

```ts
userId: string;
```

The id of the user.

### username

```ts
username: string;
```

Username of the member.
