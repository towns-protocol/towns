# Class: GroupEncryption

Defined in: [packages/encryption/src/groupEncryption.ts:24](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryption.ts#L24)

Group encryption implementation

## Param

parameters, as per [EncryptionAlgorithm](EncryptionAlgorithm.md)

## theme_extends

- [`EncryptionAlgorithm`](EncryptionAlgorithm.md)

## Constructors

### Constructor

```ts
new GroupEncryption(params): GroupEncryption;
```

Defined in: [packages/encryption/src/groupEncryption.ts:26](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryption.ts#L26)

#### Parameters

##### params

[`IEncryptionParams`](../interfaces/IEncryptionParams.md)

#### Returns

`GroupEncryption`

#### Overrides

[`EncryptionAlgorithm`](EncryptionAlgorithm.md).[`constructor`](EncryptionAlgorithm.md#constructor)

## Properties

### algorithm

```ts
readonly algorithm: GroupEncryption = GroupEncryptionAlgorithmId.GroupEncryption;
```

Defined in: [packages/encryption/src/groupEncryption.ts:25](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryption.ts#L25)

***

### client

```ts
readonly client: IGroupEncryptionClient;
```

Defined in: [packages/encryption/src/base.ts:34](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/base.ts#L34)

#### Inherited from

[`EncryptionAlgorithm`](EncryptionAlgorithm.md).[`client`](EncryptionAlgorithm.md#client)

***

### device

```ts
readonly device: EncryptionDevice;
```

Defined in: [packages/encryption/src/base.ts:33](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/base.ts#L33)

olm.js wrapper

#### Inherited from

[`EncryptionAlgorithm`](EncryptionAlgorithm.md).[`device`](EncryptionAlgorithm.md#device)

## Methods

### encrypt()

```ts
encrypt(streamId, payload): Promise<EncryptedData>;
```

Defined in: [packages/encryption/src/groupEncryption.ts:95](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryption.ts#L95)

#### Parameters

##### streamId

`string`

##### payload

`Uint8Array`

#### Returns

`Promise`\<`EncryptedData`\>

Promise which resolves to the new event body

#### Overrides

[`EncryptionAlgorithm`](EncryptionAlgorithm.md).[`encrypt`](EncryptionAlgorithm.md#encrypt)

***

### ~~encrypt\_deprecated\_v0()~~

```ts
encrypt_deprecated_v0(streamId, payload): Promise<EncryptedData>;
```

Defined in: [packages/encryption/src/groupEncryption.ts:78](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryption.ts#L78)

#### Parameters

##### streamId

`string`

##### payload

`string`

#### Returns

`Promise`\<`EncryptedData`\>

#### Deprecated

#### Overrides

[`EncryptionAlgorithm`](EncryptionAlgorithm.md).[`encrypt_deprecated_v0`](EncryptionAlgorithm.md#encrypt_deprecated_v0)

***

### ensureOutboundSession()

```ts
ensureOutboundSession(streamId, opts?): Promise<void>;
```

Defined in: [packages/encryption/src/groupEncryption.ts:30](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryption.ts#L30)

#### Parameters

##### streamId

`string`

##### opts?

###### awaitInitialShareSession

`boolean`

#### Returns

`Promise`\<`void`\>

#### Overrides

[`EncryptionAlgorithm`](EncryptionAlgorithm.md).[`ensureOutboundSession`](EncryptionAlgorithm.md#ensureoutboundsession)
