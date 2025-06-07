# Class: `abstract` EncryptionAlgorithm

Defined in: [packages/encryption/src/base.ts:32](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/base.ts#L32)

base type for encryption implementations

## theme_extended_by

- [`GroupEncryption`](GroupEncryption.md)
- [`HybridGroupEncryption`](HybridGroupEncryption.md)

## Implements

- [`IEncryptionParams`](../interfaces/IEncryptionParams.md)

## Constructors

### Constructor

```ts
new EncryptionAlgorithm(params): EncryptionAlgorithm;
```

Defined in: [packages/encryption/src/base.ts:39](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/base.ts#L39)

#### Parameters

##### params

[`IEncryptionParams`](../interfaces/IEncryptionParams.md)

parameters

#### Returns

`EncryptionAlgorithm`

## Properties

### client

```ts
readonly client: IGroupEncryptionClient;
```

Defined in: [packages/encryption/src/base.ts:34](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/base.ts#L34)

#### Implementation of

[`IEncryptionParams`](../interfaces/IEncryptionParams.md).[`client`](../interfaces/IEncryptionParams.md#client)

***

### device

```ts
readonly device: EncryptionDevice;
```

Defined in: [packages/encryption/src/base.ts:33](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/base.ts#L33)

olm.js wrapper

#### Implementation of

[`IEncryptionParams`](../interfaces/IEncryptionParams.md).[`device`](../interfaces/IEncryptionParams.md#device)

## Methods

### encrypt()

```ts
abstract encrypt(streamId, payload): Promise<EncryptedData>;
```

Defined in: [packages/encryption/src/base.ts:50](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/base.ts#L50)

#### Parameters

##### streamId

`string`

##### payload

`Uint8Array`

#### Returns

`Promise`\<`EncryptedData`\>

***

### encrypt\_deprecated\_v0()

```ts
abstract encrypt_deprecated_v0(streamId, payload): Promise<EncryptedData>;
```

Defined in: [packages/encryption/src/base.ts:49](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/base.ts#L49)

#### Parameters

##### streamId

`string`

##### payload

`string`

#### Returns

`Promise`\<`EncryptedData`\>

***

### ensureOutboundSession()

```ts
abstract ensureOutboundSession(streamId, opts?): Promise<void>;
```

Defined in: [packages/encryption/src/base.ts:44](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/base.ts#L44)

#### Parameters

##### streamId

`string`

##### opts?

###### awaitInitialShareSession

`boolean`

#### Returns

`Promise`\<`void`\>
