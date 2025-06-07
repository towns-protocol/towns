# Function: useTowns()

```ts
function useTowns<T>(selector, config?): ObservableValue<T extends PersistedModel<UnwrappedData> ? UnwrappedData : T>;
```

Defined in: [react-sdk/src/useTowns.ts:16](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useTowns.ts#L16)

Hook to get an observable from the sync agent.

An alternative of our premade hooks, allowing the creation of custom abstractions.

## Type Parameters

### T

`T`

## Parameters

### selector

(`sync`) => [`Observable`](../../Towns-Protocol-SDK/classes/Observable.md)\<`T`\>

A selector function to get a observable from the sync agent.

### config?

[`FromData`](../namespaces/ObservableConfig/type-aliases/FromData.md)\<`T`\>

Configuration options for the observable.

## Returns

[`ObservableValue`](../type-aliases/ObservableValue.md)\<`T` *extends* [`PersistedModel`](../../Towns-Protocol-SDK/type-aliases/PersistedModel.md)\<`UnwrappedData`\> ? `UnwrappedData` : `T`\>

The data from the selected observable.
