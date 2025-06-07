# Type Alias: MemberModel

```ts
type MemberModel = object;
```

Defined in: [packages/sdk/src/sync-agent/members/models/member.ts:9](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/members/models/member.ts#L9)

## Properties

### displayName

```ts
displayName: string;
```

Defined in: [packages/sdk/src/sync-agent/members/models/member.ts:28](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/members/models/member.ts#L28)

Display name of the member.

***

### ensAddress?

```ts
optional ensAddress: string;
```

Defined in: [packages/sdk/src/sync-agent/members/models/member.ts:36](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/members/models/member.ts#L36)

ENS address of the member.
Should not be trusted, as it can be spoofed.
You should be validating it.

***

### id

```ts
id: string;
```

Defined in: [packages/sdk/src/sync-agent/members/models/member.ts:14](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/members/models/member.ts#L14)

**`Internal`**

The store id of the member.

***

### initialized

```ts
initialized: boolean;
```

Defined in: [packages/sdk/src/sync-agent/members/models/member.ts:20](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/members/models/member.ts#L20)

Whether the SyncAgent has loaded this data.

***

### isDisplayNameEncrypted?

```ts
optional isDisplayNameEncrypted: boolean;
```

Defined in: [packages/sdk/src/sync-agent/members/models/member.ts:30](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/members/models/member.ts#L30)

Whether the display name is encrypted.

***

### isUsernameConfirmed

```ts
isUsernameConfirmed: boolean;
```

Defined in: [packages/sdk/src/sync-agent/members/models/member.ts:24](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/members/models/member.ts#L24)

Whether the username has been confirmed by the River node.

***

### isUsernameEncrypted

```ts
isUsernameEncrypted: boolean;
```

Defined in: [packages/sdk/src/sync-agent/members/models/member.ts:26](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/members/models/member.ts#L26)

Whether the username is encrypted.

***

### membership?

```ts
optional membership: MembershipOp;
```

Defined in: [packages/sdk/src/sync-agent/members/models/member.ts:44](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/members/models/member.ts#L44)

MembershipOp of the member.

***

### nft?

```ts
optional nft: NftModel;
```

Defined in: [packages/sdk/src/sync-agent/members/models/member.ts:42](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/members/models/member.ts#L42)

[NftModel](NftModel.md) of the member.
Should not be trusted, as it can be spoofed.
You should be validating it.

***

### streamId

```ts
streamId: string;
```

Defined in: [packages/sdk/src/sync-agent/members/models/member.ts:18](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/members/models/member.ts#L18)

The id of the stream where the data belongs to.

***

### userId

```ts
userId: string;
```

Defined in: [packages/sdk/src/sync-agent/members/models/member.ts:16](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/members/models/member.ts#L16)

The id of the user.

***

### username

```ts
username: string;
```

Defined in: [packages/sdk/src/sync-agent/members/models/member.ts:22](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/members/models/member.ts#L22)

Username of the member.
