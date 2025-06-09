# Class: UnauthenticatedClient

Defined in: [packages/sdk/src/unauthenticatedClient.ts:11](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/unauthenticatedClient.ts#L11)

## Constructors

### Constructor

```ts
new UnauthenticatedClient(
   rpcClient, 
   logNamespaceFilter?, 
   opts?): UnauthenticatedClient;
```

Defined in: [packages/sdk/src/unauthenticatedClient.ts:22](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/unauthenticatedClient.ts#L22)

#### Parameters

##### rpcClient

[`StreamRpcClient`](../type-aliases/StreamRpcClient.md)

##### logNamespaceFilter?

`string`

##### opts?

[`UnpackEnvelopeOpts`](../interfaces/UnpackEnvelopeOpts.md) = `...`

#### Returns

`UnauthenticatedClient`

## Properties

### rpcClient

```ts
readonly rpcClient: StreamRpcClient;
```

Defined in: [packages/sdk/src/unauthenticatedClient.ts:12](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/unauthenticatedClient.ts#L12)

## Methods

### getStream()

```ts
getStream(streamId): Promise<StreamStateView>;
```

Defined in: [packages/sdk/src/unauthenticatedClient.ts:67](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/unauthenticatedClient.ts#L67)

#### Parameters

##### streamId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

#### Returns

`Promise`\<[`StreamStateView`](StreamStateView.md)\>

***

### scrollback()

```ts
scrollback(streamView): Promise<{
  fromInclusiveMiniblockNum: bigint;
  terminus: boolean;
}>;
```

Defined in: [packages/sdk/src/unauthenticatedClient.ts:100](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/unauthenticatedClient.ts#L100)

#### Parameters

##### streamView

[`StreamStateView`](StreamStateView.md)

#### Returns

`Promise`\<\{
  `fromInclusiveMiniblockNum`: `bigint`;
  `terminus`: `boolean`;
\}\>

***

### streamExists()

```ts
streamExists(streamId): Promise<boolean>;
```

Defined in: [packages/sdk/src/unauthenticatedClient.ts:57](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/unauthenticatedClient.ts#L57)

#### Parameters

##### streamId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

#### Returns

`Promise`\<`boolean`\>

***

### userExists()

```ts
userExists(userId): Promise<boolean>;
```

Defined in: [packages/sdk/src/unauthenticatedClient.ts:52](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/unauthenticatedClient.ts#L52)

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<`boolean`\>

***

### userWithAddressExists()

```ts
userWithAddressExists(address): Promise<boolean>;
```

Defined in: [packages/sdk/src/unauthenticatedClient.ts:48](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/unauthenticatedClient.ts#L48)

#### Parameters

##### address

`Uint8Array`

#### Returns

`Promise`\<`boolean`\>
