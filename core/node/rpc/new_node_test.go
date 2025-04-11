package rpc

import (
	"testing"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

func TestNoRecordNoStart(t *testing.T) {
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 1})
	require := tester.require

	err := tester.startSingle(0)
	require.Error(err)
	require.Equal(Err_UNKNOWN_NODE, AsRiverError(err).Code)
}
