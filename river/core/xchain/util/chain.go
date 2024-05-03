package util

import (
	"context"
	"math/big"
	"time"

	"github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/protocol"

	"github.com/river-build/river/core/node/crypto"
)

const (
	// MaxHistoricalBlockOffset is the maximum number of blocks to go back when searching for a start block.
	MaxHistoricalBlockOffset uint64 = 100
)

func StartBlockNumber(
	ctx context.Context,
	client crypto.BlockchainClient,
	deadline time.Time,
) (uint64, error) {
	head, err := client.HeaderByNumber(ctx, nil)
	if err != nil {
		return 0, err
	}

	// determine the first block with block.Time >= deadline, start at the maximum offset of 100 blocks
	// and do a binary search to find the first block that satisfies the criteria.
	var (
		last  = head.Number.Uint64()
		start = uint64(0)
		step  = MaxHistoricalBlockOffset
	)

	if step < last { // consider only last 100 blocks if chain > 100 blocks long
		start = last - step
	}

	for start <= last {
		middle := (start + last) / 2
		middleHead, err := client.HeaderByNumber(ctx, new(big.Int).SetUint64(middle))
		if err != nil {
			return 0, base.AsRiverError(err, protocol.Err_UNAVAILABLE).Message("Unable to determine start block")
		}
		t := time.Unix(int64(middleHead.Time), 0)
		if t.After(deadline) {
			last = middle - 1
		} else if t.Before(deadline) {
			start = middle + 1
		} else {
			return middle, nil
		}
	}

	return start, nil
}

// StartBlockNumberWithHistory returns the first block with a timestamp that is equal or larger than the given history
// to look back. It will only go back MaxHistoricalBlockOffset blocks.
func StartBlockNumberWithHistory(
	ctx context.Context,
	client crypto.BlockchainClient,
	history time.Duration,
) (uint64, error) {
	if history < 0 || history > time.Minute {
		return 0, base.AsRiverError(nil, protocol.Err_INVALID_ARGUMENT).
			Message("History must be in range [0s, 1m]")
	}

	return StartBlockNumber(ctx, client, time.Now().Add(-history))
}
