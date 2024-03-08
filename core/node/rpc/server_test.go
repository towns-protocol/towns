package rpc_test

import (
	"fmt"
	"testing"

	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/testutils/dbtestutils"

	"connectrpc.com/connect"
	"github.com/stretchr/testify/require"
)

func TestServerShutdown(t *testing.T) {
	require := require.New(t)
	ctx := test.NewTestContext()
	dbUrl, schemaName, dbCloser, err := dbtestutils.StartDB(ctx)
	require.NoError(err)
	defer dbCloser()

	stub, url, closer := testServerAndClient(t, ctx, dbUrl, schemaName)
	defer func() {
		if closer != nil {
			closer()
		}
	}()

	_, err = stub.Info(ctx, connect.NewRequest(&protocol.InfoRequest{}))
	require.NoError(err)

	fmt.Println("Shutting down server")
	closer()
	closer = nil
	fmt.Println("Server shut down")

	stub2 := testClient(url)
	_, err = stub2.Info(ctx, connect.NewRequest(&protocol.InfoRequest{}))
	require.Error(err)
}
