package utils

import (
	"context"
	"time"

	"connectrpc.com/connect"
	"go.uber.org/zap"

	"github.com/towns-protocol/towns/core/node/logging"
)

const (
	// RpcStreamIdKey is key under which the streamId is set if the RPC call is made within the context of a stream.
	RpcStreamIdKey = "streamId"
)

type RequestWithStreamId interface {
	GetStreamId() string
}

// CtxAndLogForRequest returns a new context and logger for the given request.
// If the request is made in the context of a stream it will try to add the stream id to the logger.
func CtxAndLogForRequest[T any](ctx context.Context, req *connect.Request[T]) (context.Context, *zap.SugaredLogger) {
	log := logging.FromCtx(ctx)

	// Add streamId to log context if present in request
	if reqMsg, ok := any(req.Msg).(RequestWithStreamId); ok {
		streamId := reqMsg.GetStreamId()
		if streamId != "" {
			log = log.With(RpcStreamIdKey, streamId).With("application", "streamNode")
			return logging.CtxWithLog(ctx, log), log
		}
	}

	return ctx, log
}

// UncancelContext returns a new context without original parent cancel.
// Write operations should not be cancelled even if RPC context is cancelled.
// Deadline is re-used from original context. If it's smaller than minTimeout, it's increased.
// If original context has no deadline, it's set to defaultTimeout.
func UncancelContext(
	ctx context.Context,
	minTimeout, defaultTimeout time.Duration,
) (context.Context, context.CancelFunc) {
	deadline, ok := ctx.Deadline()
	now := time.Now()
	if ok {
		if deadline.Before(now.Add(minTimeout)) {
			deadline = now.Add(minTimeout)
		}
	} else {
		deadline = now.Add(defaultTimeout)
	}
	ctx = context.WithoutCancel(ctx)
	return context.WithDeadline(ctx, deadline)
}

// UncancelContextWithTimeout returns a new context without original parent cancel.
// New timeout is set to the given timeout.
func UncancelContextWithTimeout(
	ctx context.Context,
	timeout time.Duration,
) (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.WithoutCancel(ctx), timeout)
}
