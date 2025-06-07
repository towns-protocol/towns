# Class: CodeException

Defined in: [packages/dlog/src/check.ts:6](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/dlog/src/check.ts#L6)

## theme_extends

- `Error`

## Constructors

### Constructor

```ts
new CodeException(
   message, 
   code, 
   data?): CodeException;
```

Defined in: [packages/dlog/src/check.ts:9](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/dlog/src/check.ts#L9)

#### Parameters

##### message

`string`

##### code

`number`

##### data?

`any`

#### Returns

`CodeException`

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
code: number;
```

Defined in: [packages/dlog/src/check.ts:7](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/dlog/src/check.ts#L7)

***

### data?

```ts
optional data: any;
```

Defined in: [packages/dlog/src/check.ts:8](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/dlog/src/check.ts#L8)

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
