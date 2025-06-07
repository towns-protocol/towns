# Class: Myself

Defined in: [packages/sdk/src/sync-agent/members/models/myself.ts:6](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/members/models/myself.ts#L6)

## Constructors

### Constructor

```ts
new Myself(
   member, 
   streamId, 
   riverConnection): Myself;
```

Defined in: [packages/sdk/src/sync-agent/members/models/myself.ts:7](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/members/models/myself.ts#L7)

#### Parameters

##### member

[`Member`](Member.md)

##### streamId

`string`

##### riverConnection

[`RiverConnection`](RiverConnection.md)

#### Returns

`Myself`

## Properties

### member

```ts
member: Member;
```

Defined in: [packages/sdk/src/sync-agent/members/models/myself.ts:8](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/members/models/myself.ts#L8)

***

### riverConnection

```ts
protected riverConnection: RiverConnection;
```

Defined in: [packages/sdk/src/sync-agent/members/models/myself.ts:10](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/members/models/myself.ts#L10)

***

### streamId

```ts
protected streamId: string;
```

Defined in: [packages/sdk/src/sync-agent/members/models/myself.ts:9](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/members/models/myself.ts#L9)

## Accessors

### displayName

#### Get Signature

```ts
get displayName(): string;
```

Defined in: [packages/sdk/src/sync-agent/members/models/myself.ts:21](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/members/models/myself.ts#L21)

##### Returns

`string`

***

### ensAddress

#### Get Signature

```ts
get ensAddress(): undefined | string;
```

Defined in: [packages/sdk/src/sync-agent/members/models/myself.ts:25](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/members/models/myself.ts#L25)

##### Returns

`undefined` \| `string`

***

### membership

#### Get Signature

```ts
get membership(): undefined | MembershipOp;
```

Defined in: [packages/sdk/src/sync-agent/members/models/myself.ts:33](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/members/models/myself.ts#L33)

##### Returns

`undefined` \| `MembershipOp`

***

### nft

#### Get Signature

```ts
get nft(): undefined | NftModel;
```

Defined in: [packages/sdk/src/sync-agent/members/models/myself.ts:29](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/members/models/myself.ts#L29)

##### Returns

`undefined` \| [`NftModel`](../type-aliases/NftModel.md)

***

### userId

#### Get Signature

```ts
get userId(): string;
```

Defined in: [packages/sdk/src/sync-agent/members/models/myself.ts:13](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/members/models/myself.ts#L13)

##### Returns

`string`

***

### username

#### Get Signature

```ts
get username(): string;
```

Defined in: [packages/sdk/src/sync-agent/members/models/myself.ts:17](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/members/models/myself.ts#L17)

##### Returns

`string`

## Methods

### setDisplayName()

```ts
setDisplayName(displayName): Promise<void>;
```

Defined in: [packages/sdk/src/sync-agent/members/models/myself.ts:54](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/members/models/myself.ts#L54)

#### Parameters

##### displayName

`string`

#### Returns

`Promise`\<`void`\>

***

### setEnsAddress()

```ts
setEnsAddress(ensAddress): Promise<void>;
```

Defined in: [packages/sdk/src/sync-agent/members/models/myself.ts:70](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/members/models/myself.ts#L70)

#### Parameters

##### ensAddress

`` `0x${string}` ``

#### Returns

`Promise`\<`void`\>

***

### setNft()

```ts
setNft(nft): Promise<void>;
```

Defined in: [packages/sdk/src/sync-agent/members/models/myself.ts:86](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/members/models/myself.ts#L86)

#### Parameters

##### nft

[`NftModel`](../type-aliases/NftModel.md)

#### Returns

`Promise`\<`void`\>

***

### setUsername()

```ts
setUsername(username): Promise<void>;
```

Defined in: [packages/sdk/src/sync-agent/members/models/myself.ts:37](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/members/models/myself.ts#L37)

#### Parameters

##### username

`string`

#### Returns

`Promise`\<`void`\>
