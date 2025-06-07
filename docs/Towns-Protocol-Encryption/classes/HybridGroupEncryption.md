# Class: HybridGroupEncryption

Defined in: [packages/encryption/src/hybridGroupEncryption.ts:20](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/hybridGroupEncryption.ts#L20)

Hybrid Group encryption implementation

## Param

parameters, as per [EncryptionAlgorithm](EncryptionAlgorithm.md)

## theme_extends

- [`EncryptionAlgorithm`](EncryptionAlgorithm.md)

## Constructors

### Constructor

```ts
new HybridGroupEncryption(params): HybridGroupEncryption;
```

Defined in: [packages/encryption/src/hybridGroupEncryption.ts:22](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/hybridGroupEncryption.ts#L22)

#### Parameters

##### params

[`IEncryptionParams`](../interfaces/IEncryptionParams.md)

#### Returns

`HybridGroupEncryption`

#### Overrides

[`EncryptionAlgorithm`](EncryptionAlgorithm.md).[`constructor`](EncryptionAlgorithm.md#constructor)

## Properties

### algorithm

```ts
readonly algorithm: HybridGroupEncryption = GroupEncryptionAlgorithmId.HybridGroupEncryption;
```

Defined in: [packages/encryption/src/hybridGroupEncryption.ts:21](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/hybridGroupEncryption.ts#L21)

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

### \_ensureOutboundSession()

```ts
_ensureOutboundSession(streamId, opts?): Promise<HybridGroupSessionKey>;
```

Defined in: [packages/encryption/src/hybridGroupEncryption.ts:33](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/hybridGroupEncryption.ts#L33)

#### Parameters

##### streamId

`string`

##### opts?

###### awaitInitialShareSession

`boolean`

#### Returns

`Promise`\<`HybridGroupSessionKey`\>

***

### encrypt()

```ts
encrypt(streamId, payload): Promise<EncryptedData>;
```

Defined in: [packages/encryption/src/hybridGroupEncryption.ts:107](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/hybridGroupEncryption.ts#L107)

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

Defined in: [packages/encryption/src/hybridGroupEncryption.ts:87](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/hybridGroupEncryption.ts#L87)

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

Defined in: [packages/encryption/src/hybridGroupEncryption.ts:26](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/hybridGroupEncryption.ts#L26)

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
