# Interface: SignerContext

Defined in: [packages/sdk/src/signerContext.ts:27](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/signerContext.ts#L27)

SignerContext is a context used for signing events.

Two different scenarios are supported:

1. Signing is delegeted from the user key to the device key, and events are signed with device key.
   In this case, `signerPrivateKey` should return a device private key, and `delegateSig` should be
   a signature of the device public key by the user private key.

2. Events are signed with the user key. In this case, `signerPrivateKey` should return a user private key.
   `delegateSig` should be undefined.

In both scenarios `creatorAddress` should be set to the user address derived from the user public key.

## Param

a function that returns a private key to sign events

## Param

a creator, i.e. user address derived from the user public key

## Param

an optional delegate signature

## Param

an optional delegate expiry epoch

## Properties

### creatorAddress

```ts
creatorAddress: Uint8Array;
```

Defined in: [packages/sdk/src/signerContext.ts:29](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/signerContext.ts#L29)

***

### delegateExpiryEpochMs?

```ts
optional delegateExpiryEpochMs: bigint;
```

Defined in: [packages/sdk/src/signerContext.ts:31](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/signerContext.ts#L31)

***

### delegateSig?

```ts
optional delegateSig: Uint8Array<ArrayBufferLike>;
```

Defined in: [packages/sdk/src/signerContext.ts:30](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/signerContext.ts#L30)

***

### signerPrivateKey()

```ts
signerPrivateKey: () => string;
```

Defined in: [packages/sdk/src/signerContext.ts:28](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/signerContext.ts#L28)

#### Returns

`string`
