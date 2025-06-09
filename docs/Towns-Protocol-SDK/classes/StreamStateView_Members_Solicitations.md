# Class: StreamStateView\_Members\_Solicitations

Defined in: [packages/sdk/src/streamStateView\_Members\_Solicitations.ts:10](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members_Solicitations.ts#L10)

## Constructors

### Constructor

```ts
new StreamStateView_Members_Solicitations(streamId): StreamStateView_Members_Solicitations;
```

Defined in: [packages/sdk/src/streamStateView\_Members\_Solicitations.ts:14](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members_Solicitations.ts#L14)

#### Parameters

##### streamId

`string`

#### Returns

`StreamStateView_Members_Solicitations`

## Properties

### snapshotEventId?

```ts
optional snapshotEventId: string;
```

Defined in: [packages/sdk/src/streamStateView\_Members\_Solicitations.ts:12](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members_Solicitations.ts#L12)

***

### snapshotSigBundle?

```ts
optional snapshotSigBundle: EventSignatureBundle;
```

Defined in: [packages/sdk/src/streamStateView\_Members\_Solicitations.ts:11](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members_Solicitations.ts#L11)

***

### streamId

```ts
readonly streamId: string;
```

Defined in: [packages/sdk/src/streamStateView\_Members\_Solicitations.ts:14](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members_Solicitations.ts#L14)

## Methods

### applyFulfillment()

```ts
applyFulfillment(
   user, 
   fulfillment, 
   encryptionEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_Members\_Solicitations.ts:65](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members_Solicitations.ts#L65)

#### Parameters

##### user

[`StreamMember`](../type-aliases/StreamMember.md)

##### fulfillment

`MemberPayload_KeyFulfillment`

##### encryptionEmitter

`undefined` | `TypedEventEmitter`\<[`StreamEncryptionEvents`](../type-aliases/StreamEncryptionEvents.md)\>

#### Returns

`void`

***

### applySolicitation()

```ts
applySolicitation(
   user, 
   eventId, 
   solicitation, 
   sigBundle, 
   encryptionEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_Members\_Solicitations.ts:37](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members_Solicitations.ts#L37)

#### Parameters

##### user

[`StreamMember`](../type-aliases/StreamMember.md)

##### eventId

`string`

##### solicitation

`MemberPayload_KeySolicitation`

##### sigBundle

[`EventSignatureBundle`](../../Towns-Protocol-Encryption/interfaces/EventSignatureBundle.md)

##### encryptionEmitter

`undefined` | `TypedEventEmitter`\<[`StreamEncryptionEvents`](../type-aliases/StreamEncryptionEvents.md)\>

#### Returns

`void`

***

### initSolicitations()

```ts
initSolicitations(
   eventHashStr, 
   members, 
   sigBundle, 
   encryptionEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_Members\_Solicitations.ts:16](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members_Solicitations.ts#L16)

#### Parameters

##### eventHashStr

`string`

##### members

[`StreamMember`](../type-aliases/StreamMember.md)[]

##### sigBundle

[`EventSignatureBundle`](../../Towns-Protocol-Encryption/interfaces/EventSignatureBundle.md)

##### encryptionEmitter

`undefined` | `TypedEventEmitter`\<[`StreamEncryptionEvents`](../type-aliases/StreamEncryptionEvents.md)\>

#### Returns

`void`
