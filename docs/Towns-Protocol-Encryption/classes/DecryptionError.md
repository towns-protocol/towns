# Class: DecryptionError

Defined in: [packages/encryption/src/base.ts:85](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/base.ts#L85)

Exception thrown when decryption fails

## Param

user-visible message describing the problem

## Param

key/value pairs reported in the logs but not shown
  to the user.

## theme_extends

- `Error`

## Constructors

### Constructor

```ts
new DecryptionError(code, msg): DecryptionError;
```

Defined in: [packages/encryption/src/base.ts:86](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/base.ts#L86)

#### Parameters

##### code

`string`

##### msg

`string`

#### Returns

`DecryptionError`

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

### code

```ts
readonly code: string;
```

Defined in: [packages/encryption/src/base.ts:87](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/base.ts#L87)

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
