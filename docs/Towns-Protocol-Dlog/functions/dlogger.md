# Function: dlogger()

```ts
function dlogger(ns): ExtendedLogger;
```

Defined in: [packages/dlog/src/dlog.ts:261](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/dlog/src/dlog.ts#L261)

Create complex logger with multiple levels

## Parameters

### ns

`string`

Namespace for the logger.

## Returns

[`ExtendedLogger`](../interfaces/ExtendedLogger.md)

New logger with log/info/error namespace `ns`.
