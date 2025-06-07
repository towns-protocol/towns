# Class: EncryptionDelegate

Defined in: [packages/encryption/src/encryptionDelegate.ts:13](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDelegate.ts#L13)

## Constructors

### Constructor

```ts
new EncryptionDelegate(): EncryptionDelegate;
```

Defined in: [packages/encryption/src/encryptionDelegate.ts:18](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDelegate.ts#L18)

#### Returns

`EncryptionDelegate`

## Properties

### isInitialized

```ts
isInitialized: boolean = false;
```

Defined in: [packages/encryption/src/encryptionDelegate.ts:15](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDelegate.ts#L15)

## Methods

### createAccount()

```ts
createAccount(): Account;
```

Defined in: [packages/encryption/src/encryptionDelegate.ts:29](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDelegate.ts#L29)

#### Returns

`Account`

***

### createInboundGroupSession()

```ts
createInboundGroupSession(): InboundGroupSession;
```

Defined in: [packages/encryption/src/encryptionDelegate.ts:43](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDelegate.ts#L43)

#### Returns

`InboundGroupSession`

***

### createOutboundGroupSession()

```ts
createOutboundGroupSession(): OutboundGroupSession;
```

Defined in: [packages/encryption/src/encryptionDelegate.ts:50](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDelegate.ts#L50)

#### Returns

`OutboundGroupSession`

***

### createPkDecryption()

```ts
createPkDecryption(): PkDecryption;
```

Defined in: [packages/encryption/src/encryptionDelegate.ts:64](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDelegate.ts#L64)

#### Returns

`PkDecryption`

***

### createPkEncryption()

```ts
createPkEncryption(): PkEncryption;
```

Defined in: [packages/encryption/src/encryptionDelegate.ts:57](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDelegate.ts#L57)

#### Returns

`PkEncryption`

***

### createPkSigning()

```ts
createPkSigning(): PkSigning;
```

Defined in: [packages/encryption/src/encryptionDelegate.ts:71](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDelegate.ts#L71)

#### Returns

`PkSigning`

***

### createSession()

```ts
createSession(): Session;
```

Defined in: [packages/encryption/src/encryptionDelegate.ts:36](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDelegate.ts#L36)

#### Returns

`Session`

***

### createUtility()

```ts
createUtility(): Utility;
```

Defined in: [packages/encryption/src/encryptionDelegate.ts:78](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDelegate.ts#L78)

#### Returns

`Utility`

***

### init()

```ts
init(): Promise<void>;
```

Defined in: [packages/encryption/src/encryptionDelegate.ts:20](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDelegate.ts#L20)

#### Returns

`Promise`\<`void`\>
