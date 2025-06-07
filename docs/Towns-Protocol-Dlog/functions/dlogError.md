# Function: dlogError()

```ts
function dlogError(ns): DLogger;
```

Defined in: [packages/dlog/src/dlog.ts:244](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/dlog/src/dlog.ts#L244)

Same as dlog, but logger is bound to console.error so clicking on it expands log site callstack (in addition to printed error callstack).
Also, logger is enabled by default, except if running in jest.

## Parameters

### ns

`string`

Namespace for the logger.

## Returns

[`DLogger`](../interfaces/DLogger.md)

New logger with namespace `ns`.
