package rpc_test

import (
	"testing"

	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/protocol"

	"connectrpc.com/connect"
)

func TestServerShutdown(t *testing.T) {
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 1, start: true})
	ctx := tester.ctx
	require := tester.require
	log := dlog.FromCtx(ctx)

	stub := tester.testClient(0)
	url := tester.nodes[0].url

	_, err := stub.Info(ctx, connect.NewRequest(&protocol.InfoRequest{}))
	require.NoError(err)

	log.Info("Shutting down server")
	tester.nodes[0].Close(ctx, tester.dbUrl)
	log.Info("Server shut down")

	stub2 := testClient(url)
	_, err = stub2.Info(ctx, connect.NewRequest(&protocol.InfoRequest{}))
	require.Error(err)
}
