# Class: Mutex

Defined in: [packages/web3/src/test-helpers/TestGatingUtils.ts:14](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/test-helpers/TestGatingUtils.ts#L14)

## Constructors

### Constructor

```ts
new Mutex(): Mutex;
```

Defined in: [packages/web3/src/test-helpers/TestGatingUtils.ts:17](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/test-helpers/TestGatingUtils.ts#L17)

#### Returns

`Mutex`

## Properties

### locked

```ts
locked: boolean;
```

Defined in: [packages/web3/src/test-helpers/TestGatingUtils.ts:16](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/test-helpers/TestGatingUtils.ts#L16)

***

### queue

```ts
queue: (value) => void[];
```

Defined in: [packages/web3/src/test-helpers/TestGatingUtils.ts:15](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/test-helpers/TestGatingUtils.ts#L15)

#### Parameters

##### value

`void` | `PromiseLike`\<`void`\>

#### Returns

`void`

## Methods

### lock()

```ts
lock(): Promise<void>;
```

Defined in: [packages/web3/src/test-helpers/TestGatingUtils.ts:22](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/test-helpers/TestGatingUtils.ts#L22)

#### Returns

`Promise`\<`void`\>

***

### unlock()

```ts
unlock(): void;
```

Defined in: [packages/web3/src/test-helpers/TestGatingUtils.ts:39](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/test-helpers/TestGatingUtils.ts#L39)

#### Returns

`void`
