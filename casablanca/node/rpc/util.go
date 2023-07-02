package rpc

import (
	. "casablanca/node/base"
	"casablanca/node/dlog"
	"context"

	connect_go "github.com/bufbuild/connect-go"
	"golang.org/x/exp/slog"
)

func requestIdFromRequest[T any](req *connect_go.Request[T]) string {
	r := req.Header().Get("river-request-id")
	// Limit request id to 16 char max
	if len(r) > 16 {
		r = r[:16]
	} else if r == "" {
		r = GenShortNanoid()
	}
	return r
}

func ctxAndLogForRequest[T any](ctx context.Context, req *connect_go.Request[T]) (context.Context, *slog.Logger) {
	requestId := requestIdFromRequest(req)

	// Get logger from context and extend with request id
	log := dlog.CtxLog(ctx).With("request_id", requestId)

	// Create new context with logger
	ctx = dlog.CtxWithLog(ctx, log)
	return ctx, log
}
