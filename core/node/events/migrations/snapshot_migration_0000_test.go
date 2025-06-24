package migrations

import (
	"testing"

	"github.com/stretchr/testify/require"

	. "github.com/towns-protocol/towns/core/node/protocol"
)

// a no-op migration test for the initial snapshot, use as a template for new migrations
func TestSnapshotMigration0000(t *testing.T) {
	// a no-op migration for the initial snapshot
	snapshot := &Snapshot{}
	// just pass an empty snapshot
	snapshot_migration_0000(snapshot)
	// expect that the snapshot is still valid after migration
	require.NotNil(t, snapshot)
}
