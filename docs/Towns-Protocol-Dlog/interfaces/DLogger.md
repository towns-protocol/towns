# Interface: DLogger()

Defined in: [packages/dlog/src/dlog.ts:126](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/dlog/src/dlog.ts#L126)

```ts
DLogger(...args): void;
```

Defined in: [packages/dlog/src/dlog.ts:127](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/dlog/src/dlog.ts#L127)

## Parameters

### args

...`unknown`[]

## Returns

`void`

## Properties

### baseDebug

```ts
baseDebug: Debugger;
```

Defined in: [packages/dlog/src/dlog.ts:132](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/dlog/src/dlog.ts#L132)

***

### enabled

```ts
enabled: boolean;
```

Defined in: [packages/dlog/src/dlog.ts:129](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/dlog/src/dlog.ts#L129)

***

### extend()

```ts
extend: (namespace, delimiter?) => DLogger;
```

Defined in: [packages/dlog/src/dlog.ts:131](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/dlog/src/dlog.ts#L131)

#### Parameters

##### namespace

`string`

##### delimiter?

`string`

#### Returns

`DLogger`

***

### namespace

```ts
namespace: string;
```

Defined in: [packages/dlog/src/dlog.ts:130](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/dlog/src/dlog.ts#L130)

***

### opts?

```ts
optional opts: DLogOpts;
```

Defined in: [packages/dlog/src/dlog.ts:133](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/dlog/src/dlog.ts#L133)
