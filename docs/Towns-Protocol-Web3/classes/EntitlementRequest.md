# Class: EntitlementRequest

Defined in: [packages/web3/src/cache/Keyable.ts:41](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/cache/Keyable.ts#L41)

## Implements

- [`Keyable`](../interfaces/Keyable.md)

## Constructors

### Constructor

```ts
new EntitlementRequest(
   spaceId, 
   channelId, 
   userId, 
   permission): EntitlementRequest;
```

Defined in: [packages/web3/src/cache/Keyable.ts:46](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/cache/Keyable.ts#L46)

#### Parameters

##### spaceId

`string`

##### channelId

`string`

##### userId

`string`

##### permission

[`Permission`](../type-aliases/Permission.md)

#### Returns

`EntitlementRequest`

## Properties

### channelId

```ts
channelId: string;
```

Defined in: [packages/web3/src/cache/Keyable.ts:43](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/cache/Keyable.ts#L43)

***

### permission

```ts
permission: Permission;
```

Defined in: [packages/web3/src/cache/Keyable.ts:45](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/cache/Keyable.ts#L45)

***

### spaceId

```ts
spaceId: string;
```

Defined in: [packages/web3/src/cache/Keyable.ts:42](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/cache/Keyable.ts#L42)

***

### userId

```ts
userId: string;
```

Defined in: [packages/web3/src/cache/Keyable.ts:44](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/cache/Keyable.ts#L44)

## Methods

### toKey()

```ts
toKey(): string;
```

Defined in: [packages/web3/src/cache/Keyable.ts:52](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/cache/Keyable.ts#L52)

#### Returns

`string`

#### Implementation of

[`Keyable`](../interfaces/Keyable.md).[`toKey`](../interfaces/Keyable.md#tokey)
