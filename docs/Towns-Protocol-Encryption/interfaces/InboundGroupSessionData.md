# Interface: InboundGroupSessionData

Defined in: [packages/encryption/src/encryptionDevice.ts:36](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L36)

data stored in the session store about an inbound group session

## theme_extended_by

- [`ExtendedInboundGroupSessionData`](ExtendedInboundGroupSessionData.md)

## Properties

### keysClaimed

```ts
keysClaimed: Record<string, string>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:40](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L40)

***

### session

```ts
session: string;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:39](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L39)

pickled InboundGroupSession

***

### stream\_id

```ts
stream_id: string;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:37](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L37)

***

### untrusted?

```ts
optional untrusted: boolean;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:42](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L42)

whether this session is untrusted.
