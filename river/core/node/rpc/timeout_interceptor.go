package rpc

import (
	"context"
	"time"

	"connectrpc.com/connect"
)

func NewTimeoutInterceptor(defaultTimeout time.Duration) connect.UnaryInterceptorFunc {
	interceptor := func(next connect.UnaryFunc) connect.UnaryFunc {
		return func(
			ctx context.Context,
			req connect.AnyRequest,
		) (connect.AnyResponse, error) {
			if defaultTimeout != 0 {
				var cancel context.CancelFunc
				_, ok := ctx.Deadline()
				if !ok {
					ctx, cancel = context.WithTimeout(ctx, defaultTimeout)
					defer cancel()
				}
			}
			return next(ctx, req)
		}
	}
	return interceptor
}
