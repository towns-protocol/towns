# Class: SimpleCache\<K, V\>

Defined in: [packages/web3/src/cache/SimpleCache.ts:4](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/cache/SimpleCache.ts#L4)

## Type Parameters

### K

`K` *extends* [`Keyable`](../interfaces/Keyable.md)

### V

`V`

## Constructors

### Constructor

```ts
new SimpleCache<K, V>(args): SimpleCache<K, V>;
```

Defined in: [packages/web3/src/cache/SimpleCache.ts:12](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/cache/SimpleCache.ts#L12)

#### Parameters

##### args

###### maxSize?

`number`

###### ttlSeconds?

`number`

#### Returns

`SimpleCache`\<`K`, `V`\>

## Methods

### add()

```ts
add(key, value): void;
```

Defined in: [packages/web3/src/cache/SimpleCache.ts:25](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/cache/SimpleCache.ts#L25)

#### Parameters

##### key

`K`

##### value

`V`

#### Returns

`void`

***

### clear()

```ts
clear(): void;
```

Defined in: [packages/web3/src/cache/SimpleCache.ts:33](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/cache/SimpleCache.ts#L33)

#### Returns

`void`

***

### executeUsingCache()

```ts
executeUsingCache(key, fetchFn): Promise<V>;
```

Defined in: [packages/web3/src/cache/SimpleCache.ts:41](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/cache/SimpleCache.ts#L41)

Executes a function to fetch a value if it's not in the cache,
stores the result, and returns it.

#### Parameters

##### key

`K`

##### fetchFn

(`key`) => `Promise`\<`V`\>

#### Returns

`Promise`\<`V`\>

***

### get()

```ts
get(key): undefined | V;
```

Defined in: [packages/web3/src/cache/SimpleCache.ts:21](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/cache/SimpleCache.ts#L21)

#### Parameters

##### key

`K`

#### Returns

`undefined` \| `V`

***

### remove()

```ts
remove(key): void;
```

Defined in: [packages/web3/src/cache/SimpleCache.ts:29](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/cache/SimpleCache.ts#L29)

#### Parameters

##### key

`K`

#### Returns

`void`
