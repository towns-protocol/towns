package auth

import (
	"context"

	"connectrpc.com/connect"

	"github.com/towns-protocol/towns/core/node/rpc/headers"
)

// Test-only entitlement bypass support. This interceptor reads a header and, when enabled,
// annotates the context to allow downstream authorization to short-circuit.

type testBypassCtxKey struct{}

type testBypassInterceptor struct {
	secret string
}

func NewTestBypassInterceptor(secret string) connect.Interceptor {
	return &testBypassInterceptor{secret: secret}
}

func (i *testBypassInterceptor) WrapUnary(next connect.UnaryFunc) connect.UnaryFunc {
	return func(ctx context.Context, req connect.AnyRequest) (connect.AnyResponse, error) {
		// If secret is empty, bypass is disabled.
		if i.secret != "" && req != nil {
			hdr := req.Header().Get(headers.RiverTestBypassHeaderName)
			if hdr != "" && hdr == i.secret {
				ctx = context.WithValue(ctx, testBypassCtxKey{}, true)
			}
		}
		return next(ctx, req)
	}
}

func (i *testBypassInterceptor) WrapStreamingClient(next connect.StreamingClientFunc) connect.StreamingClientFunc {
	return func(ctx context.Context, spec connect.Spec) connect.StreamingClientConn {
		return next(ctx, spec)
	}
}

func (i *testBypassInterceptor) WrapStreamingHandler(next connect.StreamingHandlerFunc) connect.StreamingHandlerFunc {
	return func(ctx context.Context, conn connect.StreamingHandlerConn) error {
		if i.secret != "" && conn != nil {
			hdr := conn.RequestHeader().Get(headers.RiverTestBypassHeaderName)
			if hdr != "" && hdr == i.secret {
				ctx = context.WithValue(ctx, testBypassCtxKey{}, true)
			}
		}
		return next(ctx, conn)
	}
}

// IsTestEntitlementBypassEnabled returns true if the request context was marked by the
// test-bypass interceptor.
func IsTestEntitlementBypassEnabled(ctx context.Context) bool {
	if ctx == nil {
		return false
	}
	v := ctx.Value(testBypassCtxKey{})
	if v == nil {
		return false
	}
	b, _ := v.(bool)
	return b
}
