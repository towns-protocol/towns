# Function: persistedObservable()

```ts
function persistedObservable(options): <T>(constructor) => {
(...args): (Anonymous class)<T>;
  prototype: (Anonymous class)<any>;
  tableName: string;
} & T;
```

Defined in: [packages/sdk/src/observable/persistedObservable.ts:21](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/persistedObservable.ts#L21)

## Parameters

### options

[`PersistedOpts`](../interfaces/PersistedOpts.md)

## Returns

```ts
<T>(constructor): {
(...args): (Anonymous class)<T>;
  prototype: (Anonymous class)<any>;
  tableName: string;
} & T;
```

### Type Parameters

#### T

`T` *extends* (...`args`) => `Storable`

### Parameters

#### constructor

`T`

### Returns

\{
(...`args`): `(Anonymous class)`\<`T`\>;
  `prototype`: `(Anonymous class)`\<`any`\>;
  `tableName`: `string`;
\} & `T`
