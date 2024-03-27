import { Snapshot } from '@river-build/proto'
import { snapshotMigration0000 } from './snapshotMigration0000'
import { snapshotMigration0001 } from './snapshotMigration0001'

const SNAPSHOT_MIGRATIONS = [snapshotMigration0000, snapshotMigration0001]

export function migrateSnapshot(snapshot: Snapshot): Snapshot {
    const currentVersion = SNAPSHOT_MIGRATIONS.length
    if (snapshot.snapshotVersion >= currentVersion) {
        return snapshot
    }
    let result = snapshot
    for (let i: number = snapshot.snapshotVersion; i < currentVersion; i++) {
        result = SNAPSHOT_MIGRATIONS[i](result)
    }
    result.snapshotVersion = currentVersion
    return result
}
