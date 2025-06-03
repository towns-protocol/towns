# Class: PromiseQueue\<T\>

Defined in: [packages/sdk/src/sync-agent/utils/promiseQueue.ts:5](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/utils/promiseQueue.ts#L5)

## Type Parameters

### T

`T`

## Constructors

### Constructor

```ts
new PromiseQueue<T>(): PromiseQueue<T>;
```

#### Returns

`PromiseQueue`\<`T`\>

## Methods

### enqueue()

```ts
enqueue<Q>(fn): Promise<Q>;
```

Defined in: [packages/sdk/src/sync-agent/utils/promiseQueue.ts:12](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/utils/promiseQueue.ts#L12)

#### Type Parameters

##### Q

`Q`

#### Parameters

##### fn

(`object`) => `Promise`\<`Q`\>

#### Returns

`Promise`\<`Q`\>

***

### flush()

```ts
flush(object): void;
```

Defined in: [packages/sdk/src/sync-agent/utils/promiseQueue.ts:18](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/utils/promiseQueue.ts#L18)

#### Parameters

##### object

`T`

#### Returns

`void`
