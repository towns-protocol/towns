# Class: MemberMetadata\_Nft

Defined in: [packages/sdk/src/memberMetadata\_Nft.ts:7](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Nft.ts#L7)

## Constructors

### Constructor

```ts
new MemberMetadata_Nft(streamId): MemberMetadata_Nft;
```

Defined in: [packages/sdk/src/memberMetadata\_Nft.ts:17](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Nft.ts#L17)

#### Parameters

##### streamId

`string`

#### Returns

`MemberMetadata_Nft`

## Properties

### confirmedNfts

```ts
readonly confirmedNfts: Map<string, MemberPayload_Nft>;
```

Defined in: [packages/sdk/src/memberMetadata\_Nft.ts:11](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Nft.ts#L11)

***

### log

```ts
log: DLogger;
```

Defined in: [packages/sdk/src/memberMetadata\_Nft.ts:8](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Nft.ts#L8)

***

### nftEvents

```ts
readonly nftEvents: Map<string, {
  nft: MemberPayload_Nft;
  pending: boolean;
  userId: string;
}>;
```

Defined in: [packages/sdk/src/memberMetadata\_Nft.ts:12](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Nft.ts#L12)

***

### streamId

```ts
readonly streamId: string;
```

Defined in: [packages/sdk/src/memberMetadata\_Nft.ts:9](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Nft.ts#L9)

***

### userIdToEventId

```ts
readonly userIdToEventId: Map<string, string>;
```

Defined in: [packages/sdk/src/memberMetadata\_Nft.ts:10](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Nft.ts#L10)

## Methods

### addNftEvent()

```ts
addNftEvent(
   eventId, 
   nft, 
   userId, 
   pending, 
   stateEmitter): void;
```

Defined in: [packages/sdk/src/memberMetadata\_Nft.ts:29](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Nft.ts#L29)

#### Parameters

##### eventId

`string`

##### nft

`MemberPayload_Nft`

##### userId

`string`

##### pending

`boolean`

##### stateEmitter

`undefined` | `TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

***

### applySnapshot()

```ts
applySnapshot(nfts): void;
```

Defined in: [packages/sdk/src/memberMetadata\_Nft.ts:21](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Nft.ts#L21)

#### Parameters

##### nfts

`object`[]

#### Returns

`void`

***

### info()

```ts
info(userId): 
  | undefined
  | {
  chainId: number;
  contractAddress: string;
  tokenId: string;
};
```

Defined in: [packages/sdk/src/memberMetadata\_Nft.ts:107](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Nft.ts#L107)

#### Parameters

##### userId

`string`

#### Returns

  \| `undefined`
  \| \{
  `chainId`: `number`;
  `contractAddress`: `string`;
  `tokenId`: `string`;
\}

***

### isValidNft()

```ts
isValidNft(nft): boolean;
```

Defined in: [packages/sdk/src/memberMetadata\_Nft.ts:125](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Nft.ts#L125)

#### Parameters

##### nft

`MemberPayload_Nft`

#### Returns

`boolean`

***

### onConfirmEvent()

```ts
onConfirmEvent(eventId, emitter?): void;
```

Defined in: [packages/sdk/src/memberMetadata\_Nft.ts:65](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Nft.ts#L65)

#### Parameters

##### eventId

`string`

##### emitter?

`TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`
