package rpc

import (
	"context"
	"net/http"

	"connectrpc.com/connect"

	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/protocol"
)

type recoverHandlerInterceptor struct{}

func NewRecoverHandlerInterceptor() connect.Interceptor {
	return &recoverHandlerInterceptor{}
}

func (i *recoverHandlerInterceptor) WrapUnary(next connect.UnaryFunc) connect.UnaryFunc {
	return func(
		ctx context.Context,
		req connect.AnyRequest,
	) (_ connect.AnyResponse, retErr error) {
		if req.Spec().IsClient {
			return next(ctx, req)
		}

		panicked := true
		defer func() {
			if panicked {
				r := recover()
				// net/http checks for ErrAbortHandler with ==, so we should too.
				if r == http.ErrAbortHandler { //nolint:errorlint,goerr113
					panic(r) //nolint:forbidigo
				}
				retErr = base.RiverError(protocol.Err_INTERNAL, "panic in handler", "recover", r)
			}
		}()
		res, err := next(ctx, req)
		panicked = false
		return res, err
	}
}

func (i *recoverHandlerInterceptor) WrapStreamingClient(next connect.StreamingClientFunc) connect.StreamingClientFunc {
	return func(
		ctx context.Context,
		spec connect.Spec,
	) connect.StreamingClientConn {
		return next(ctx, spec)
	}
}

func (i *recoverHandlerInterceptor) WrapStreamingHandler(
	next connect.StreamingHandlerFunc,
) connect.StreamingHandlerFunc {
	return func(ctx context.Context, conn connect.StreamingHandlerConn) (retErr error) {
		panicked := true
		defer func() {
			if panicked {
				r := recover()
				// net/http checks for ErrAbortHandler with ==, so we should too.
				if r == http.ErrAbortHandler { //nolint:errorlint,goerr113
					panic(r) //nolint:forbidigo
				}
				retErr = base.RiverError(protocol.Err_INTERNAL, "panic in handler", "recover", r)
			}
		}()
		err := next(ctx, conn)
		panicked = false
		return err
	}
}
