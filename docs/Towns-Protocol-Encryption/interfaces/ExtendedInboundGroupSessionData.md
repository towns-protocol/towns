# Interface: ExtendedInboundGroupSessionData

Defined in: [packages/encryption/src/storeTypes.ts:28](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/storeTypes.ts#L28)

data stored in the session store about an inbound group session

## theme_extends

- [`InboundGroupSessionData`](InboundGroupSessionData.md)

## Properties

### keysClaimed

```ts
keysClaimed: Record<string, string>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:40](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L40)

#### Inherited from

[`InboundGroupSessionData`](InboundGroupSessionData.md).[`keysClaimed`](InboundGroupSessionData.md#keysclaimed)

***

### session

```ts
session: string;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:39](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L39)

pickled InboundGroupSession

#### Inherited from

[`InboundGroupSessionData`](InboundGroupSessionData.md).[`session`](InboundGroupSessionData.md#session)

***

### sessionId

```ts
sessionId: string;
```

Defined in: [packages/encryption/src/storeTypes.ts:30](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/storeTypes.ts#L30)

***

### stream\_id

```ts
stream_id: string;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:37](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L37)

#### Inherited from

[`InboundGroupSessionData`](InboundGroupSessionData.md).[`stream_id`](InboundGroupSessionData.md#stream_id)

***

### streamId

```ts
streamId: string;
```

Defined in: [packages/encryption/src/storeTypes.ts:29](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/storeTypes.ts#L29)

***

### untrusted?

```ts
optional untrusted: boolean;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:42](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L42)

whether this session is untrusted.

#### Inherited from

[`InboundGroupSessionData`](InboundGroupSessionData.md).[`untrusted`](InboundGroupSessionData.md#untrusted)
