package migrations

import (
	. "github.com/towns-protocol/towns/core/node/protocol"
)

type migrationFunc func(*Snapshot)

// should be kept in sync with packages/sdk/src/migrations/migrate_snapshot.ts
var MIGRATIONS = []migrationFunc{
	snapshot_migration_0000,
	snapshot_migration_0001,
	snapshot_migration_0002,
	snapshot_migration_0003,
	snapshot_migration_0004,
	snapshot_migration_0005,
	snapshot_migration_0006,
}

func CurrentSnapshotVersion() int32 {
	return int32(len(MIGRATIONS))
}

func MigrateSnapshot(iSnapshot *Snapshot) {
	currentVersion := CurrentSnapshotVersion()
	if iSnapshot.SnapshotVersion >= currentVersion {
		return
	}
	for i := iSnapshot.SnapshotVersion; i < currentVersion; i++ {
		MIGRATIONS[i](iSnapshot)
	}
	iSnapshot.SnapshotVersion = currentVersion
}
