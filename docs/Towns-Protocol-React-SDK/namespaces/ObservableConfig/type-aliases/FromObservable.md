# Type Alias: FromObservable\<Observable_\>

```ts
type FromObservable<Observable_> = Observable_ extends Observable<infer Data> ? FromData<Data> : never;
```

Defined in: [react-sdk/src/useObservable.ts:12](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useObservable.ts#L12)

Configuration options for an observable.
It can be used to configure the behavior of the `useObservable` hook.

## Type Parameters

### Observable_

`Observable_`
