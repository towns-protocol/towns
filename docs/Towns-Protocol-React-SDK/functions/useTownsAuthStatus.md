# Function: useTownsAuthStatus()

```ts
function useTownsAuthStatus(config?): object;
```

Defined in: [react-sdk/src/useTownsAuthStatus.ts:12](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useTownsAuthStatus.ts#L12)

Hook to get the auth status of the user connection with the Towns network.

## Parameters

### config?

`undefined`

Configuration options for the observable.

## Returns

An object containing the current AuthStatus status and boolean flags for each possible status.

### isConnectedToTowns

```ts
isConnectedToTowns: boolean;
```

Whether the user connection with the Towns network is connected to Towns.

### isConnectingToTowns

```ts
isConnectingToTowns: boolean;
```

Whether the user connection with the Towns network is connecting to Towns.

### isCredentialed

```ts
isCredentialed: boolean;
```

Whether the user connection with the Towns network is credentialed.

### isDisconnected

```ts
isDisconnected: boolean;
```

Whether the user connection with the Towns network is disconnected.

### isError

```ts
isError: boolean;
```

Whether the user connection with the Towns network is in an error state.

### isEvaluatingCredentials

```ts
isEvaluatingCredentials: boolean;
```

Whether the user connection with the Towns network is evaluating credentials.

### isInitializing

```ts
isInitializing: boolean;
```

Whether the user connection with the Towns network is initializing.

### status

```ts
status: AuthStatus;
```

The current AuthStatus of the user connection with the Towns network.
