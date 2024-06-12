# River Node Coding Conventions

## Logs

Logging is done using Go's [slog](https://pkg.go.dev/log/slog) package for structured logging.

Current logger is saved into variable `log` and logging statement takes a message and optional key-value pairs like this:

```go
log.Debug("Starting new snapshot", "streamId", streamId, "blockNumber", curBlockNum)
```

There is wrapper called [dlog](./dlog) which
provides coloring and better formatting for types we user frequently (protos, binary arrays).

Normally logger is passed in [context](https://pkg.go.dev/context) and retrieved using `dlog.FromCtx`:

```go
func loadNodeRegistry(ctx context.Context, nodeRegistryPath string, localNode *nodes.LocalNode) (nodes.NodeRegistry, error) {
	log := dlog.FromCtx(ctx)

	if nodeRegistryPath == "" {
		log.Warn("No node registry path specified, running in single node configuration")
		return nodes.MakeSingleNodeRegistry(ctx, localNode), nil
	}

	log.Info("Loading node registry", "path", nodeRegistryPath)
	return nodes.LoadNodeRegistry(ctx, nodeRegistryPath, localNode)
}
```

All "regular" request-related logging should be done at `Debug` level. Request errors are logged as `Warn` on RPC return.
Additional information about request errors can be logged at `Warn` if necessary, however the default should
be to augment the returned error with extra information instead.

`Error` is reserved for node-wide errors, and should not be used for per-request logging.

`Info` is used for general logging and should not be used for per-request logging.

## Errors

For all errors generated in node use RiverError. If there is no matching error code add new code in
[protocol.proto](../../protocol/protocol.proto).
Arguments are `errorCode`, `message`, optional key-value pairs:

```go
return RiverError(Err_PERMISSION_DENIED, "user must join themselves", "user", userId)
```

Wrap third party-errors coming from other modules in river error:

```go
err := MyDbCall()
if err != nil {
    return WrapRiverError(Err_BAD_LINK_WALLET_BAD_SIGNATURE, err)
}
```

Passing errors can "cast" by calling `AsRiverError`:

```go
err := nodeRegistry.Load()
if err != nil {
    return AsRiverError(err).Func("MyFunc")
}
```

It's ok to use `AsRiverError` on other types of errors: in this case it auto-wraps with unknown error code.

River errors can be agumented with extra information without the need to create a new error:

```go
return AsRiverError(err).
    Func("LinkWallet").
    Message("error validating wallet link").
    Tag("userId", userId).
    Tags("anotherTag", 123, "yetAnotherTag", 456)

// Or for the new error:
return RiverError(Err_PERMISSION_DENIED, "user must join themselves", "user", userId).Func("AddJoinEvent")

// Or for the wrapped error:
return WrapRiverError(Err_BAD_LINK_WALLET_BAD_SIGNATURE, err).
    Func("LinkWallet").
    Message("error validating wallet link").
    Tag("userId", userId).
    Tags("anotherTag", 123, "yetAnotherTag", 456)
```

River error can be logged:

```go
return AsRiverError(err).
    Func("LinkWallet").
    LogWarn(log)

// Or for the new error:
return RiverError(Err_PERMISSION_DENIED, "user must join themselves", "user", userId).Func("AddJoinEvent").LogDebug(log)

// Or for the wrapped error:
return WrapRiverError(Err_BAD_LINK_WALLET_BAD_SIGNATURE, err).
    Func("LinkWallet").
    Message("error validating wallet link").
    Tag("userId", userId).
    LogWarn(log)
```

This can functionality can be used as necessary, but since all request errors are logged on RPC level, for requrest processing
the default should be to augument passing error and let RPC layer do the logging once.

## . imports

While it's not idiomatic go, it's ok to use dot imports for base, protocol, events (use judgement for other cases).
Since request processing code works with classes
from these packages very tightly not doing this leads to endless unreadable prefixes. It's a bit impractical to merge these into
one packages, so dot imports it is:

```go
package rpc

import (
	"context"
	"encoding/hex"

	"connectrpc.com/connect"

	"github.com/river-build/river/core/node/auth"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/common"
	"github.com/river-build/river/core/node/crypto"
	. "github.com/river-build/river/core/node/events"
	"github.com/river-build/river/core/node/infra"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/storage"
)
```
