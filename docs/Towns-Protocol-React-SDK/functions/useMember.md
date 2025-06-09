# Function: useMember()

```ts
function useMember(props, config?): object;
```

Defined in: [react-sdk/src/useMember.ts:15](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useMember.ts#L15)

Hook to get data from a specific member of a Space, GDM, Channel, or DM.

## Parameters

### props

The streamId and userId of the member to get data from.

#### streamId

`string`

#### userId

`string`

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

The Member data.

### displayName

```ts
displayName: string = data.displayName;
```

### ensAddress

```ts
ensAddress: undefined | string = data.ensAddress;
```

### error

```ts
error: undefined | Error;
```

If the model is in an error state, this will be the error.

### initialized

```ts
initialized: boolean = data.initialized;
```

### isDisplayNameEncrypted

```ts
isDisplayNameEncrypted: undefined | boolean = data.isDisplayNameEncrypted;
```

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

### isUsernameConfirmed

```ts
isUsernameConfirmed: boolean = data.isUsernameConfirmed;
```

### isUsernameEncrypted

```ts
isUsernameEncrypted: boolean = data.isUsernameEncrypted;
```

### membership

```ts
membership: undefined | MembershipOp = data.membership;
```

### nft

```ts
nft: 
  | undefined
  | NftModel = data.nft;
```

### status

```ts
status: "error" | "loading" | "loaded";
```

The status of the model.

### streamId

```ts
streamId: string = data.streamId;
```

### userId

```ts
userId: string = data.userId;
```

### username

```ts
username: string = data.username;
```
