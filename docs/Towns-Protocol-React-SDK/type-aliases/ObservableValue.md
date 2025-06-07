# Type Alias: ObservableValue\<T\>

```ts
type ObservableValue<T> = object;
```

Defined in: [react-sdk/src/useObservable.ts:54](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useObservable.ts#L54)

The value returned by the useObservable hook.
If the observable is a PersistedModel, it will include error and status information.

## Type Parameters

### T

`T`

## Properties

### data

```ts
data: T;
```

Defined in: [react-sdk/src/useObservable.ts:56](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useObservable.ts#L56)

The data of the model.

***

### error

```ts
error: Error | undefined;
```

Defined in: [react-sdk/src/useObservable.ts:58](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useObservable.ts#L58)

If the model is in an error state, this will be the error.

***

### isError

```ts
isError: boolean;
```

Defined in: [react-sdk/src/useObservable.ts:64](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useObservable.ts#L64)

True if the model is in an error state.

***

### isLoaded

```ts
isLoaded: boolean;
```

Defined in: [react-sdk/src/useObservable.ts:66](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useObservable.ts#L66)

True if the data is loaded.

***

### isLoading

```ts
isLoading: boolean;
```

Defined in: [react-sdk/src/useObservable.ts:62](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useObservable.ts#L62)

True if the model is in a loading state.

***

### status

```ts
status: "loading" | "loaded" | "error";
```

Defined in: [react-sdk/src/useObservable.ts:60](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useObservable.ts#L60)

The status of the model.
