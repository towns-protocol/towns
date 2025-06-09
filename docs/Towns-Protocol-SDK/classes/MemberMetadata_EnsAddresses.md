# Class: MemberMetadata\_EnsAddresses

Defined in: [packages/sdk/src/memberMetadata\_EnsAddresses.ts:6](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_EnsAddresses.ts#L6)

## Constructors

### Constructor

```ts
new MemberMetadata_EnsAddresses(streamId): MemberMetadata_EnsAddresses;
```

Defined in: [packages/sdk/src/memberMetadata\_EnsAddresses.ts:16](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_EnsAddresses.ts#L16)

#### Parameters

##### streamId

`string`

#### Returns

`MemberMetadata_EnsAddresses`

## Properties

### confirmedEnsAddresses

```ts
readonly confirmedEnsAddresses: Map<string, string>;
```

Defined in: [packages/sdk/src/memberMetadata\_EnsAddresses.ts:10](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_EnsAddresses.ts#L10)

***

### ensAddressEvents

```ts
readonly ensAddressEvents: Map<string, {
  ensAddress: Uint8Array;
  pending: boolean;
  userId: string;
}>;
```

Defined in: [packages/sdk/src/memberMetadata\_EnsAddresses.ts:11](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_EnsAddresses.ts#L11)

***

### log

```ts
log: DLogger;
```

Defined in: [packages/sdk/src/memberMetadata\_EnsAddresses.ts:7](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_EnsAddresses.ts#L7)

***

### streamId

```ts
readonly streamId: string;
```

Defined in: [packages/sdk/src/memberMetadata\_EnsAddresses.ts:8](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_EnsAddresses.ts#L8)

***

### userIdToEventId

```ts
readonly userIdToEventId: Map<string, string>;
```

Defined in: [packages/sdk/src/memberMetadata\_EnsAddresses.ts:9](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_EnsAddresses.ts#L9)

## Methods

### addEnsAddressEvent()

```ts
addEnsAddressEvent(
   eventId, 
   ensAddress, 
   userId, 
   pending, 
   stateEmitter): void;
```

Defined in: [packages/sdk/src/memberMetadata\_EnsAddresses.ts:30](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_EnsAddresses.ts#L30)

#### Parameters

##### eventId

`string`

##### ensAddress

`Uint8Array`

##### userId

`string`

##### pending

`boolean`

##### stateEmitter

`undefined` | `TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

***

### applySnapshot()

```ts
applySnapshot(ensAddresses): void;
```

Defined in: [packages/sdk/src/memberMetadata\_EnsAddresses.ts:20](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_EnsAddresses.ts#L20)

#### Parameters

##### ensAddresses

`object`[]

#### Returns

`void`

***

### info()

```ts
info(userId): undefined | string;
```

Defined in: [packages/sdk/src/memberMetadata\_EnsAddresses.ts:108](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_EnsAddresses.ts#L108)

#### Parameters

##### userId

`string`

#### Returns

`undefined` \| `string`

***

### onConfirmEvent()

```ts
onConfirmEvent(eventId, emitter?): void;
```

Defined in: [packages/sdk/src/memberMetadata\_EnsAddresses.ts:49](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_EnsAddresses.ts#L49)

#### Parameters

##### eventId

`string`

##### emitter?

`TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`
