# Function: waitFor()

```ts
function waitFor<T>(callback, options): Promise<T>;
```

Defined in: [packages/sdk/src/tests/testUtils.ts:1019](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/tests/testUtils.ts#L1019)

## Type Parameters

### T

`T` *extends* `boolean` \| `void`

## Parameters

### callback

() => `T` | () => `Promise`\<`T`\>

### options

#### timeoutMS

`number`

## Returns

`Promise`\<`T`\>
