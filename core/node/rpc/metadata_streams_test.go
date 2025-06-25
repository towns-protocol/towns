package rpc

import (
	"testing"
	"time"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
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

	// Non-operator can't create
	tc := tt.newTestClient(0, testClientOpts{})
	streamId := MetadataStreamIdFromShard(0)
	resp, err := tc.rpcClient().CreateMetadataStream(tc.ctx, streamId)
	tt.require.ErrorIs(err, RiverError(Err_PERMISSION_DENIED, ""))
	tt.require.ErrorContains(err, "creator is not an operator")
	tt.require.Nil(resp)

	// Shard number out of range
	tc = tt.newTestClientWithWallet(0, testClientOpts{}, tt.btc.OperatorWallets[0])
	streamId = MetadataStreamIdFromShard(10)
	resp, err = tc.rpcClient().CreateMetadataStream(tc.ctx, streamId)
	tt.require.ErrorIs(err, RiverError(Err_PERMISSION_DENIED, ""))
	tt.require.ErrorContains(err, "metadata shard is out of range")
	tt.require.Nil(resp)

	tt.createMetadataStreams()
}
