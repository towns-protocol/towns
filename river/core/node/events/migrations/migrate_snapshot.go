package migrations

import (
	. "github.com/river-build/river/core/node/protocol"
)

type migrationFunc func(*Snapshot) *Snapshot

// should be kept in sync with packages/sdk/src/migrations/migrate_snapshot.ts
var MIGRATIONS = []migrationFunc{
	snapshot_migration_0000,
	snapshot_migration_0001,
}

func CurrentSnapshotVersion() int32 {
	return int32(len(MIGRATIONS))
}

func MigrateSnapshot(iSnapshot *Snapshot) *Snapshot {
	currentVersion := CurrentSnapshotVersion()
	if iSnapshot.SnapshotVersion >= currentVersion {
		return iSnapshot
	}
	for i := iSnapshot.SnapshotVersion; i < currentVersion; i++ {
		iSnapshot = MIGRATIONS[i](iSnapshot)
	}
	iSnapshot.SnapshotVersion = currentVersion
	return iSnapshot
}
