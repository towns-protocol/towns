package migrations

import (
	"testing"

	"github.com/stretchr/testify/require"

	. "github.com/towns-protocol/towns/core/node/protocol"
)

// / zero out the tips sent and received since we're adding counts and we want them to match
func TestSnapshotMigration0003(t *testing.T) {
	userSnap := &Snapshot{
		Content: &Snapshot_UserContent{
			UserContent: &UserPayload_Snapshot{
				Inception: &UserPayload_Inception{
					StreamId: []byte{},
				},
				TipsSent: map[string]uint64{
					"ETH": 1000,
				},
				TipsReceived: map[string]uint64{
					"ETH": 1000,
				},
			},
		},
	}

	snapshot_migration_0003(userSnap)

	require.Equal(t, 0, len(userSnap.GetUserContent().TipsSent))
	require.Equal(t, 0, len(userSnap.GetUserContent().TipsReceived))
}
