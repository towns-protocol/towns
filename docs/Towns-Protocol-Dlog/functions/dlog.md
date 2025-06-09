# Function: dlog()

```ts
function dlog(ns, opts?): DLogger;
```

Defined in: [packages/dlog/src/dlog.ts:233](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/dlog/src/dlog.ts#L233)

Create a new logger with namespace `ns`.
It's based on the `debug` package logger with custom formatter:
All aguments are formatted, hex strings and UInt8Arrays are printer as hex and shortened.
No %-specifiers are supported.

## Parameters

### ns

`string`

Namespace for the logger.

### opts?

[`DLogOpts`](../interfaces/DLogOpts.md)

## Returns

[`DLogger`](../interfaces/DLogger.md)

New logger with namespace `ns`.
