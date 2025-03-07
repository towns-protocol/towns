//go:build !race

// This file contains tests that are skipped when the race detector is enabled
// because they are too resource-intensives.

package rpc

import (
	"testing"

	"github.com/towns-protocol/towns/core/node/testutils"
)

func TestReplMcConversationNoRace(t *testing.T) {
	t.Parallel()
	t.Run("10x1000", func(t *testing.T) {
		if testing.Short() {
			t.Skip("skipping 10x1000 in short mode")
		}
		testReplMcConversation(t, 10, 1000, 20, 1000)
	})
	t.Run("30x1000", func(t *testing.T) {
		if testing.Short() {
			t.Skip("skipping 30x1000 in short mode")
		}
		testReplMcConversation(t, 30, 1000, 50, 1000)
	})
	t.Run("100x100", func(t *testing.T) {
		testutils.SkipFlakyTest(t, "TODO: REPLICATION: FIX: flaky")
		if testing.Short() {
			t.Skip("skipping 100x100 in short mode")
		}
		testReplMcConversation(t, 100, 100, 20, 50)
	})
}
