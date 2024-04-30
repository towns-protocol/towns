package crypto

import (
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/protocol"
	"github.com/stretchr/testify/require"
)

func TestOnChainConfigSettingValues(t *testing.T) {
	var (
		tests = []struct {
			Key          ChainKey
			Block        uint64
			Exp          uint64
			RiverErrCode protocol.Err
		}{
			{StreamReplicationFactorKey, 0, 1, -1},
			{StreamReplicationFactorKey, 9, 1, -1},
			{StreamReplicationFactorKey, 10, 2, -1},
			{StreamReplicationFactorKey, 20, 3, -1},
			{StreamReplicationFactorKey, 21, 3, -1},
			{StreamReplicationFactorKey, 30, 0, protocol.Err_BAD_CONFIG},
		}
		settings = &onChainSettings{
			s: map[common.Hash]settings{},
		}
	)

	settings.Set(
		StreamReplicationFactorKey.ID(),
		20,
		common.Hex2Bytes("0000000000000000000000000000000000000000000000000000000000000003"),
	)
	settings.Set(StreamReplicationFactorKey.ID(), 30, common.Hex2Bytes("03")) // invalid value
	settings.Set(
		StreamReplicationFactorKey.ID(),
		0,
		common.Hex2Bytes("0000000000000000000000000000000000000000000000000000000000000001"),
	)
	settings.Set(
		StreamReplicationFactorKey.ID(),
		10,
		common.Hex2Bytes("0000000000000000000000000000000000000000000000000000000000000002"),
	)

	for _, tt := range tests {
		val, err := settings.getOnBlock(tt.Key, tt.Block).Uint64()
		if err != nil && tt.RiverErrCode == -1 {
			t.Fatalf("unexpected error: %v", err)
		} else if err != nil && err.(*base.RiverErrorImpl).Code != tt.RiverErrCode {
			t.Fatalf("want error code: %d, got %d", tt.RiverErrCode, err.(*base.RiverErrorImpl).Code)
		} else if tt.Exp != val {
			t.Errorf("expected %d, got %d", tt.Exp, val)
		}
	}
}

func TestSetOnChain(t *testing.T) {
	var (
		require     = require.New(t)
		ctx, cancel = test.NewTestContext()
	)
	defer cancel()

	tc, err := NewBlockchainTestContext(ctx, 1)
	require.NoError(err)
	defer tc.Close()

	value, err := tc.OnChainConfig.GetUint64(StreamReplicationFactorKey)
	require.NoError(err)
	require.Equal(uint64(1), value)
}
