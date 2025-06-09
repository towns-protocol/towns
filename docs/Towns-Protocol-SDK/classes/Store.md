# Class: Store

Defined in: [packages/sdk/src/store/store.ts:54](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/store/store.ts#L54)

## Constructors

### Constructor

```ts
new Store(
   name, 
   version, 
   classes): Store;
```

Defined in: [packages/sdk/src/store/store.ts:59](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/store/store.ts#L59)

#### Parameters

##### name

`string`

##### version

`number`

##### classes

`any`[]

#### Returns

`Store`

## Methods

### commitTransaction()

```ts
commitTransaction(): Promise<void>;
```

Defined in: [packages/sdk/src/store/store.ts:79](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/store/store.ts#L79)

#### Returns

`Promise`\<`void`\>

***

### load()

```ts
load<T>(
   tableName, 
   id, 
   loadPriority, 
   onLoad, 
   onError, 
   onCommitted): void;
```

Defined in: [packages/sdk/src/store/store.ts:131](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/store/store.ts#L131)

#### Type Parameters

##### T

`T` *extends* [`Identifiable`](../interfaces/Identifiable.md)

#### Parameters

##### tableName

`string`

##### id

`string`

##### loadPriority

[`LoadPriority`](../enumerations/LoadPriority.md)

##### onLoad

(`data?`) => `void`

##### onError

(`e`) => `void`

##### onCommitted

() => `void`

#### Returns

`void`

***

### newTransactionGroup()

```ts
newTransactionGroup(name): void;
```

Defined in: [packages/sdk/src/store/store.ts:70](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/store/store.ts#L70)

#### Parameters

##### name

`string`

#### Returns

`void`

***

### save()

```ts
save<T>(
   tableName, 
   data, 
   onSaved, 
   onError, 
   onCommitted): void;
```

Defined in: [packages/sdk/src/store/store.ts:160](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/store/store.ts#L160)

#### Type Parameters

##### T

`T` *extends* [`Identifiable`](../interfaces/Identifiable.md)

#### Parameters

##### tableName

`string`

##### data

`T`

##### onSaved

() => `void`

##### onError

(`e`) => `void`

##### onCommitted

() => `void`

#### Returns

`void`

***

### withTransaction()

```ts
withTransaction<T>(name, fn): T;
```

Defined in: [packages/sdk/src/store/store.ts:117](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/store/store.ts#L117)

#### Type Parameters

##### T

`T`

#### Parameters

##### name

`string`

##### fn

() => `T`

#### Returns

`T`
