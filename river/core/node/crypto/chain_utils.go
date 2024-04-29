package crypto

import (
	"slices"

	"github.com/ethereum/go-ethereum/common"
)

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
