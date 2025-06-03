# Function: useObservable()

```ts
function useObservable<Model, Data>(observable, config?): ObservableValue<Data>;
```

Defined in: [react-sdk/src/useObservable.ts:75](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useObservable.ts#L75)

This hook subscribes to an observable and returns the value of the observable.

## Type Parameters

### Model

`Model`

### Data

`Data` = `Model` *extends* [`PersistedModel`](../../Towns-Protocol-SDK/type-aliases/PersistedModel.md)\<`UnwrappedData`\> ? `UnwrappedData` : `Model`

## Parameters

### observable

[`Observable`](../../Towns-Protocol-SDK/classes/Observable.md)\<`Model`\>

The observable to subscribe to.

### config?

[`FromData`](../namespaces/ObservableConfig/type-aliases/FromData.md)\<`Model`\>

Configuration options for the observable.

## Returns

[`ObservableValue`](../type-aliases/ObservableValue.md)\<`Data`\>

The value of the observable.
