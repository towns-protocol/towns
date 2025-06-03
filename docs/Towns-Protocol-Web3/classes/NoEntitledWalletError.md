# Class: NoEntitledWalletError

Defined in: [packages/web3/src/utils/ut.ts:13](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/utils/ut.ts#L13)

## theme_extends

- `Error`

## Constructors

### Constructor

```ts
new NoEntitledWalletError(): NoEntitledWalletError;
```

Defined in: [packages/web3/src/utils/ut.ts:14](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/utils/ut.ts#L14)

#### Returns

`NoEntitledWalletError`

#### Overrides

```ts
Error.constructor
```

## Properties

### cause?

```ts
optional cause: unknown;
```

Defined in: node\_modules/typescript/lib/lib.es2022.error.d.ts:26

#### Inherited from

```ts
Error.cause
```

***

### message

```ts
message: string;
```

Defined in: node\_modules/typescript/lib/lib.es5.d.ts:1077

#### Inherited from

```ts
Error.message
```

***

### name

```ts
name: string;
```

Defined in: node\_modules/typescript/lib/lib.es5.d.ts:1076

#### Inherited from

```ts
Error.name
```

***

### stack?

```ts
optional stack: string;
```

Defined in: node\_modules/typescript/lib/lib.es5.d.ts:1078

#### Inherited from

```ts
Error.stack
```

***

### prepareStackTrace()?

```ts
static optional prepareStackTrace: (err, stackTraces) => any;
```

Defined in: node\_modules/@types/node/globals.d.ts:98

Optional override for formatting stack traces

#### Parameters

##### err

`Error`

##### stackTraces

`CallSite`[]

#### Returns

`any`

#### See

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

#### Inherited from

```ts
Error.prepareStackTrace
```

***

### stackTraceLimit

```ts
static stackTraceLimit: number;
```

Defined in: node\_modules/@types/node/globals.d.ts:100

#### Inherited from

```ts
Error.stackTraceLimit
```

## Methods

### captureStackTrace()

```ts
static captureStackTrace(targetObject, constructorOpt?): void;
```

Defined in: node\_modules/@types/node/globals.d.ts:91

Create .stack property on a target object

#### Parameters

##### targetObject

`object`

##### constructorOpt?

`Function`

#### Returns

`void`

#### Inherited from

```ts
Error.captureStackTrace
```

***

### throwIfRuntimeErrors()

```ts
static throwIfRuntimeErrors(error): undefined;
```

Defined in: [packages/web3/src/utils/ut.ts:33](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/utils/ut.ts#L33)

throwIfRuntimeErrors is a helper function to process AggregateErrors emitted from Promise.any that may
contain promises rejected with NoEntitledWalletErrors, which represent an entitlement check that evaluates
to false, and not a true error condition. This method will filter out NoEntitledWalletErrors and throw an
AggregateError with the remaining errors, if any exist. Otherwise, it will simply return undefined.

#### Parameters

##### error

`AggregateError`

AggregateError

#### Returns

`undefined`

undefined

#### Throws

AggregateError
