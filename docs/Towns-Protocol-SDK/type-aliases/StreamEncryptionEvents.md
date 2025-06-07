# Type Alias: StreamEncryptionEvents

```ts
type StreamEncryptionEvents = object;
```

Defined in: [packages/sdk/src/streamEvents.ts:37](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L37)

## Properties

### initKeySolicitations()

```ts
initKeySolicitations: (streamId, eventHashStr, members, sigBundle) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:56](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L56)

#### Parameters

##### streamId

`string`

##### eventHashStr

`string`

##### members

`object`[]

##### sigBundle

[`EventSignatureBundle`](../../Towns-Protocol-Encryption/interfaces/EventSignatureBundle.md)

#### Returns

`void`

***

### newEncryptedContent()

```ts
newEncryptedContent: (streamId, eventId, content) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:39](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L39)

#### Parameters

##### streamId

`string`

##### eventId

`string`

##### content

[`EncryptedContent`](../interfaces/EncryptedContent.md)

#### Returns

`void`

***

### newGroupSessions()

```ts
newGroupSessions: (sessions, senderId) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:38](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L38)

#### Parameters

##### sessions

`UserInboxPayload_GroupEncryptionSessions`

##### senderId

`string`

#### Returns

`void`

***

### newKeySolicitation()

```ts
newKeySolicitation: (streamId, eventHashStr, fromUserId, fromUserAddress, event, sigBundle) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:40](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L40)

#### Parameters

##### streamId

`string`

##### eventHashStr

`string`

##### fromUserId

`string`

##### fromUserAddress

`Uint8Array`

##### event

[`KeySolicitationContent`](../../Towns-Protocol-Encryption/interfaces/KeySolicitationContent.md)

##### sigBundle

[`EventSignatureBundle`](../../Towns-Protocol-Encryption/interfaces/EventSignatureBundle.md)

#### Returns

`void`

***

### updatedKeySolicitation()

```ts
updatedKeySolicitation: (streamId, eventHashStr, fromUserId, fromUserAddress, event, sigBundle) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:48](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L48)

#### Parameters

##### streamId

`string`

##### eventHashStr

`string`

##### fromUserId

`string`

##### fromUserAddress

`Uint8Array`

##### event

[`KeySolicitationContent`](../../Towns-Protocol-Encryption/interfaces/KeySolicitationContent.md)

##### sigBundle

[`EventSignatureBundle`](../../Towns-Protocol-Encryption/interfaces/EventSignatureBundle.md)

#### Returns

`void`

***

### userDeviceKeyMessage()

```ts
userDeviceKeyMessage: (streamId, userId, userDevice) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:66](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L66)

#### Parameters

##### streamId

`string`

##### userId

`string`

##### userDevice

[`UserDevice`](../../Towns-Protocol-Encryption/interfaces/UserDevice.md)

#### Returns

`void`
