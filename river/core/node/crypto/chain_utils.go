package crypto

import (
	"context"
	"slices"
	"time"

	"github.com/ethereum/go-ethereum/common"
)

// wait for the given duration or until the context is done.
// Returns true if the context is done.
func wait(ctx context.Context, duration time.Duration) bool {
	select {
	case <-ctx.Done():
		return true
	case <-time.After(duration):
		return false
	}
}

func matchTopics(cbTopics [][]common.Hash, logTopics []common.Hash) bool {
	if len(cbTopics) == 0 {
		return true
	}

	if len(cbTopics) > len(logTopics) {
		return false
	}

	// ignore extra topics in log if callback is not filtering on them
	for i, ltopic := range logTopics[:len(cbTopics)] {
		if !slices.Contains(cbTopics[i], ltopic) {
			return false
		}
	}

	return true
}
