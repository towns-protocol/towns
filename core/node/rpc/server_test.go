package rpc_test

import (
	"testing"

	"github.com/river-build/river/base/test"
	"github.com/river-build/river/protocol"
	"github.com/river-build/river/testutils/dbtestutils"

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

	closer()
	closer = nil

	stub2 := testClient(url)
	_, err = stub2.Info(ctx, connect.NewRequest(&protocol.InfoRequest{}))
	require.Error(err)
}
