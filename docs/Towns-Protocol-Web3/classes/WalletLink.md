# Class: WalletLink

Defined in: [packages/web3/src/wallet-link/WalletLink.ts:11](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/wallet-link/WalletLink.ts#L11)

## Constructors

### Constructor

```ts
new WalletLink(config, provider): WalletLink;
```

Defined in: [packages/web3/src/wallet-link/WalletLink.ts:17](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/wallet-link/WalletLink.ts#L17)

#### Parameters

##### config

[`BaseChainConfig`](../interfaces/BaseChainConfig.md)

##### provider

`Provider`

#### Returns

`WalletLink`

## Properties

### address

```ts
address: `0x${string}`;
```

Defined in: [packages/web3/src/wallet-link/WalletLink.ts:15](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/wallet-link/WalletLink.ts#L15)

## Methods

### checkIfLinked()

```ts
checkIfLinked(rootKey, wallet): Promise<boolean>;
```

Defined in: [packages/web3/src/wallet-link/WalletLink.ts:258](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/wallet-link/WalletLink.ts#L258)

#### Parameters

##### rootKey

`Signer`

##### wallet

`string`

#### Returns

`Promise`\<`boolean`\>

***

### encodeLinkCallerToRootKey()

```ts
encodeLinkCallerToRootKey(rootKey, wallet): Promise<string>;
```

Defined in: [packages/web3/src/wallet-link/WalletLink.ts:209](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/wallet-link/WalletLink.ts#L209)

#### Parameters

##### rootKey

`Signer`

##### wallet

`` `0x${string}` ``

#### Returns

`Promise`\<`string`\>

***

### encodeLinkWalletToRootKey()

```ts
encodeLinkWalletToRootKey(rootKey, wallet): Promise<string>;
```

Defined in: [packages/web3/src/wallet-link/WalletLink.ts:225](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/wallet-link/WalletLink.ts#L225)

#### Parameters

##### rootKey

`Signer`

##### wallet

`Signer`

#### Returns

`Promise`\<`string`\>

***

### encodeRemoveLink()

```ts
encodeRemoveLink(rootKey, walletAddress): Promise<string>;
```

Defined in: [packages/web3/src/wallet-link/WalletLink.ts:304](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/wallet-link/WalletLink.ts#L304)

#### Parameters

##### rootKey

`Signer`

##### walletAddress

`string`

#### Returns

`Promise`\<`string`\>

***

### getInterface()

```ts
getInterface(): WalletLinkInterface;
```

Defined in: [packages/web3/src/wallet-link/WalletLink.ts:335](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/wallet-link/WalletLink.ts#L335)

#### Returns

`WalletLinkInterface`

***

### getLinkedWallets()

```ts
getLinkedWallets(rootKey): Promise<string[]>;
```

Defined in: [packages/web3/src/wallet-link/WalletLink.ts:246](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/wallet-link/WalletLink.ts#L246)

#### Parameters

##### rootKey

`string`

#### Returns

`Promise`\<`string`[]\>

***

### getLinkedWalletsWithDelegations()

```ts
getLinkedWalletsWithDelegations(rootKey): Promise<string[]>;
```

Defined in: [packages/web3/src/wallet-link/WalletLink.ts:250](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/wallet-link/WalletLink.ts#L250)

#### Parameters

##### rootKey

`string`

#### Returns

`Promise`\<`string`[]\>

***

### getRootKeyForWallet()

```ts
getRootKeyForWallet(wallet): Promise<string>;
```

Defined in: [packages/web3/src/wallet-link/WalletLink.ts:254](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/wallet-link/WalletLink.ts#L254)

#### Parameters

##### wallet

`string`

#### Returns

`Promise`\<`string`\>

***

### isLinked()

```ts
isLinked(walletAddress): Promise<boolean>;
```

Defined in: [packages/web3/src/wallet-link/WalletLink.ts:28](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/wallet-link/WalletLink.ts#L28)

#### Parameters

##### walletAddress

`string`

#### Returns

`Promise`\<`boolean`\>

***

### linkCallerToRootKey()

```ts
linkCallerToRootKey(rootKey, wallet): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/wallet-link/WalletLink.ts:173](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/wallet-link/WalletLink.ts#L173)

Link a wallet to the root key with the wallet as the caller

#### Parameters

##### rootKey

`Signer`

##### wallet

`Signer`

#### Returns

`Promise`\<`ContractTransaction`\>

***

### linkWalletToRootKey()

```ts
linkWalletToRootKey(rootKey, wallet): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/wallet-link/WalletLink.ts:194](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/wallet-link/WalletLink.ts#L194)

Link a wallet to the root key with the root key as the caller

#### Parameters

##### rootKey

`Signer`

##### wallet

`Signer`

#### Returns

`Promise`\<`ContractTransaction`\>

***

### parseError()

```ts
parseError(error): Error;
```

Defined in: [packages/web3/src/wallet-link/WalletLink.ts:242](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/wallet-link/WalletLink.ts#L242)

#### Parameters

##### error

`any`

#### Returns

`Error`

***

### removeCallerLink()

```ts
removeCallerLink(caller): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/wallet-link/WalletLink.ts:300](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/wallet-link/WalletLink.ts#L300)

Remove link from this caller to a root key

#### Parameters

##### caller

`Signer`

#### Returns

`Promise`\<`ContractTransaction`\>

***

### removeLink()

```ts
removeLink(rootKey, walletAddress): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/wallet-link/WalletLink.ts:277](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/wallet-link/WalletLink.ts#L277)

#### Parameters

##### rootKey

`Signer`

##### walletAddress

`string`

#### Returns

`Promise`\<`ContractTransaction`\>
