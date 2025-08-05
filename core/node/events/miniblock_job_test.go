package events

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/node/crypto"
)

func TestSkipCandidate(t *testing.T) {
	require := require.New(t)
	cases := []struct {
		candidateCount int
		blockNum       crypto.BlockNumber
		expected       bool
	}{
		{0, 0, false},
		{1, 1, false},
		{9, 1, false},
		{10, 1, true},
		{10, 2, false},
		{10, 3, true},
		{10, 4, false},
		{20, 1, true},
		{20, 2, true},
		{20, 3, true},
		{20, 4, false},
		{30, 1, true},
		{30, 2, true},
		{30, 3, true},
		{30, 4, true},
		{30, 5, true},
		{30, 6, true},
		{30, 7, true},
		{30, 8, false},
		{100, 449, true},
		{100, 450, false},
		{100, 451, true},
		{100, 899, true},
		{100, 900, false},
		{100, 901, true},
	}

	for _, c := range cases {
		require.Equal(c.expected, skipCandidate(c.candidateCount, c.blockNum),
			"candidateCount: %d, blockNum: %d", c.candidateCount, c.blockNum)
	}
}
