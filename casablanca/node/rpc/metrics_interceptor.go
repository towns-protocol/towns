package rpc

import (
	"casablanca/node/infra"
	"context"
	"time"

	"github.com/bufbuild/connect-go"
)

func NewMetricsInterceptor() connect.UnaryInterceptorFunc {
	interceptor := func(next connect.UnaryFunc) connect.UnaryFunc {
		return connect.UnaryFunc(func(
			ctx context.Context,
			req connect.AnyRequest,
		) (connect.AnyResponse, error) {
			proc := req.Spec().Procedure
			defer infra.StoreExecutionTimeMetrics(proc, time.Now())
			return next(ctx, req)
		})
	}
	return connect.UnaryInterceptorFunc(interceptor)

}
