package rpc_test

import (
	"fmt"
	"testing"

	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/protocol"

	"connectrpc.com/connect"
	"github.com/stretchr/testify/require"
)

func TestServerShutdown(t *testing.T) {
	require := require.New(t)
	ctx, cancel := test.NewTestContext()
	defer cancel()

	stub, url, closer := createTestServerAndClient(ctx, 1, require)
	defer func() {
		if closer != nil {
			closer()
		}
	}()

	_, err := stub.Info(ctx, connect.NewRequest(&protocol.InfoRequest{}))
	require.NoError(err)

	fmt.Println("Shutting down server")
	closer()
	closer = nil
	fmt.Println("Server shut down")

	stub2 := testClient(url)
	_, err = stub2.Info(ctx, connect.NewRequest(&protocol.InfoRequest{}))
	require.Error(err)
}
