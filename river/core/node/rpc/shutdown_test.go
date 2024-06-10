package rpc_test

import (
	"net"
	"testing"

	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/protocol"
)

func TestShutdown(t *testing.T) {
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 1, start: true})
	require := tester.require

	first := tester.nodes[0].service

	// Setup shutdown monitor
	exitStatus := make(chan error)
	go func() {
		firstExit := <-first.ExitSignal()
		first.Close()
		exitStatus <- firstExit
	}()

	listener, err := net.Listen("tcp", "localhost:0")
	require.NoError(err)

	// Start the second node with same address
	require.NoError(tester.startSingle(0, startOpts{listeners: []net.Listener{listener}}))

	firstErr := <-exitStatus
	require.Error(firstErr)
	require.Equal(Err_RESOURCE_EXHAUSTED, AsRiverError(firstErr).Code)
}
