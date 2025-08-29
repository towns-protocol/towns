package rpc

import (
	"context"
	"fmt"

	"connectrpc.com/connect"
)

// NewVersionLoggingInterceptor creates an interceptor that logs the version header
// from client requests when they fail
func NewVersionLoggingInterceptor() connect.UnaryInterceptorFunc {
	interceptor := func(next connect.UnaryFunc) connect.UnaryFunc {
		return func(
			ctx context.Context,
			req connect.AnyRequest,
		) (connect.AnyResponse, error) {
			// Get the version header from the request
			version := req.Header().Get("Version")
			
			// Call the next handler
			resp, err := next(ctx, req)
			
			// If there was an error, log the version header
			if err != nil {
				fmt.Printf("RPC request failed - Method: %s, Version: %s, Error: %s\n", 
					req.Spec().Procedure, version, err.Error())
			}
			
			return resp, err
		}
	}
	return interceptor
}