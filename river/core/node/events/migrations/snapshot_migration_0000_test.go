package migrations

import (
	"testing"

	. "github.com/river-build/river/core/node/protocol"
	"github.com/stretchr/testify/require"
)

// a no-op migration test for the initial snapshot, use as a template for new migrations
func TestSnapshotMigration0000(t *testing.T) {
	// a no-op migration for the initial snapshot
	snapshot := &Snapshot{}
	// just pass an empty snapshot
	migratedSnapshot := snapshot_migration_0000(snapshot)
	// expect that a valid snapshot is returned
	require.NotNil(t, migratedSnapshot)
}
