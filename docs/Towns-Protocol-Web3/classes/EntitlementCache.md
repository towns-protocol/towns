# Class: EntitlementCache\<K, V\>

Defined in: [packages/web3/src/cache/EntitlementCache.ts:10](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/cache/EntitlementCache.ts#L10)

## Type Parameters

### K

`K` *extends* [`Keyable`](../interfaces/Keyable.md)

### V

`V`

## Constructors

### Constructor

```ts
new EntitlementCache<K, V>(options?): EntitlementCache<K, V>;
```

Defined in: [packages/web3/src/cache/EntitlementCache.ts:14](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/cache/EntitlementCache.ts#L14)

#### Parameters

##### options?

###### negativeCacheSize?

`number`

###### negativeCacheTTLSeconds

`number`

###### positiveCacheSize?

`number`

###### positiveCacheTTLSeconds

`number`

#### Returns

`EntitlementCache`\<`K`, `V`\>

## Methods

### executeUsingCache()

```ts
executeUsingCache(keyable, onCacheMiss): Promise<CacheResult<V>>;
```

Defined in: [packages/web3/src/cache/EntitlementCache.ts:41](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/cache/EntitlementCache.ts#L41)

#### Parameters

##### keyable

`K`

##### onCacheMiss

(`k`) => `Promise`\<[`CacheResult`](../interfaces/CacheResult.md)\<`V`\>\>

#### Returns

`Promise`\<[`CacheResult`](../interfaces/CacheResult.md)\<`V`\>\>

***

### invalidate()

```ts
invalidate(keyable): void;
```

Defined in: [packages/web3/src/cache/EntitlementCache.ts:35](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/cache/EntitlementCache.ts#L35)

#### Parameters

##### keyable

`K`

#### Returns

`void`
