# Type Alias: FromData\<Data\>

```ts
type FromData<Data> = Data extends PersistedModel<infer UnwrappedData> ? object : object;
```

Defined in: [react-sdk/src/useObservable.ts:22](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useObservable.ts#L22)

Create configuration options for an observable from the data type.
It can be used to configure the behavior of the `useObservable` hook.

## Type Parameters

### Data

`Data`
