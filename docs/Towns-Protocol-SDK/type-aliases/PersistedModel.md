# Type Alias: PersistedModel\<T\>

```ts
type PersistedModel<T> = 
  | {
  data: T;
  status: "loading";
}
  | {
  data: T;
  status: "loaded";
}
  | {
  data: T;
  error: Error;
  status: "error";
};
```

Defined in: [packages/sdk/src/observable/persistedObservable.ts:10](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/persistedObservable.ts#L10)

## Type Parameters

### T

`T`
