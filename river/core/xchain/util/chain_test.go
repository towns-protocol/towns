package util_test

import (
	"testing"
	"time"

	"github.com/river-build/river/core/xchain/util"

	"github.com/ethereum/go-ethereum/core/types"
	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/crypto"
	"github.com/stretchr/testify/require"
)

// TestStartBlockNumberRange ensures that utils.StartBlockNumber ensures that the duration to go back falls within an
// acceptable range.
func TestStartBlockNumberRange(t *testing.T) {
	t.Parallel()

	var (
		require     = require.New(t)
		ctx, cancel = test.NewTestContext()
		tests       = []struct {
			history time.Duration
		}{
			{history: -1},
			{history: time.Minute + 1},
		}
	)
	defer cancel()

	for _, tt := range tests {
		_, err := util.StartBlockNumberWithHistory(ctx, nil, tt.history)
		require.Error(err, "history expected out of range")
	}
}

// TestStartBlockNumber tests that utils.StartBlockNumber returns the correct block number given a deadline.
func TestStartBlockNumber(t *testing.T) {
	t.Parallel()

	require := require.New(t)
	ctx, cancel := test.NewTestContext()
	defer cancel()

	btc, err := crypto.NewBlockchainTestContext(ctx, 0, false)
	require.NoError(err, "instantiate blockchain test context")
	defer btc.Close()

	// create several blocks so we can go back in history
	var (
		blocks []*types.Header
		client = btc.Client()
		tests  []struct {
			deadline time.Time
			exp      uint64
		}
	)

	for i := 0; i < 4; i++ {
		<-time.After(time.Duration(1+i) * time.Second)
		btc.Commit(ctx)

		header, err := client.HeaderByNumber(ctx, nil)
		require.NoError(err, "get header by number")
		blocks = append(blocks, header)
		t.Logf("block %d: %d", header.Number.Uint64(), header.Time)
	}

	for _, b := range blocks {
		tests = append(tests, struct {
			deadline time.Time
			exp      uint64
		}{
			deadline: time.Unix(int64(b.Time), 0),
			exp:      b.Number.Uint64(),
		})
	}

	for _, tt := range tests {
		start, err := util.StartBlockNumber(ctx, client, tt.deadline)
		require.NoError(err, "start block number")
		require.Equalf(tt.exp, start, "unexpected start block number - deadline: %d", tt.deadline.Unix())
	}
}

// TestStartBlockNumberLongChain tests that utils.StartBlockNumber returns the correct block number given a deadline
// on a chain that is longer than MaxHistoricalBlockOffset.
func TestStartBlockNumberLongChain(t *testing.T) {
	t.Parallel()

	require := require.New(t)
	ctx, cancel := test.NewTestContext()
	defer cancel()

	btc, err := crypto.NewBlockchainTestContext(ctx, 0, false)
	require.NoError(err, "instantiate blockchain test context")
	defer btc.Close()

	// create a chain that has more blocks that MaxHistoricalBlockOffset
	var (
		blocks []*types.Header
		client = btc.Client()
	)

	for range int(util.MaxHistoricalBlockOffset) + 25 {
		btc.Commit(ctx)
		header, err := client.HeaderByNumber(ctx, nil)
		require.NoError(err, "get header by number")
		blocks = append(blocks, header)
	}

	// go no more than util.MaxHistoricalBlockOffset blocks back
	exp := blocks[len(blocks)-1-int(util.MaxHistoricalBlockOffset)].Number.Uint64()

	start, err := util.StartBlockNumberWithHistory(ctx, client, time.Minute)
	require.NoError(err, "start block number")
	require.Equal(exp, start, "unexpected start block number")
}
