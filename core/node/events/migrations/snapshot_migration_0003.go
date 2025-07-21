package migrations

import (
	. "github.com/towns-protocol/towns/core/node/protocol"
)

// zero out the tips sent and received since we're adding counts and we want them to match
func snapshot_migration_0003(iSnapshot *Snapshot) {
	switch snapshot := iSnapshot.Content.(type) {
	case *Snapshot_UserContent:
		snapshot.UserContent.TipsSent = make(map[string]uint64)
		snapshot.UserContent.TipsReceived = make(map[string]uint64)
		snapshot.UserContent.TipsSentCount = make(map[string]uint64)
		snapshot.UserContent.TipsReceivedCount = make(map[string]uint64)
	}
}
