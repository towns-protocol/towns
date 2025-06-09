# Class: MockEntitlementsDelegate

Defined in: [packages/sdk/src/utils.ts:46](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/utils.ts#L46)

## Constructors

### Constructor

```ts
new MockEntitlementsDelegate(): MockEntitlementsDelegate;
```

#### Returns

`MockEntitlementsDelegate`

## Methods

### isEntitled()

```ts
isEntitled(
   _spaceId, 
   _channelId, 
   _user, 
_permission): Promise<boolean>;
```

Defined in: [packages/sdk/src/utils.ts:47](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/utils.ts#L47)

#### Parameters

##### \_spaceId

`undefined` | `string`

##### \_channelId

`undefined` | `string`

##### \_user

`string`

##### \_permission

[`Permission`](../../Towns-Protocol-Web3/type-aliases/Permission.md)

#### Returns

`Promise`\<`boolean`\>
