package rpc

import (
	"context"
	"time"

	"github.com/river-build/river/infra"

	"github.com/bufbuild/connect-go"
)

func NewMetricsInterceptor() connect.UnaryInterceptorFunc {
	interceptor := func(next connect.UnaryFunc) connect.UnaryFunc {
		return func(
			ctx context.Context,
			req connect.AnyRequest,
		) (connect.AnyResponse, error) {
			proc := req.Spec().Procedure
			defer infra.StoreExecutionTimeMetrics(proc, "rpc", time.Now())
			return next(ctx, req)
		}
	}
	return interceptor
}
