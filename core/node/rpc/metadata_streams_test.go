package rpc

import (
	"testing"
	"time"

	"github.com/towns-protocol/towns/core/node/crypto"
)

func TestMetadataStreamCreation(t *testing.T) {
	tt := newServiceTester(
		t,
		serviceTesterOpts{
			numNodes:          7,
			replicationFactor: 3,
			start:             true,
			btcParams: &crypto.TestParams{
				AutoMine:         true,
				AutoMineInterval: 200 * time.Millisecond,
				MineOnTx:         false,
			},
		},
	)

	tt.createMetadataStreams()
}
