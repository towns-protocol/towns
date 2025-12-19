import { Snapshot } from '@towns-protocol/proto'
import { snapshotMigration0000 } from './snapshotMigration0000'
import { snapshotMigration0001 } from './snapshotMigration0001'
import { snapshotMigration0002 } from './snapshotMigration0002'
import { snapshotMigration0003 } from './snapshotMigration0003'
import { snapshotMigration0004 } from './snapshotMigration0004'
import { snapshotMigration0005 } from './snapshotMigration0005'
import { snapshotMigration0006 } from './snapshotMigration0006'

const SNAPSHOT_MIGRATIONS = [
    snapshotMigration0000,
    snapshotMigration0001,
    snapshotMigration0002,
    snapshotMigration0003,
    snapshotMigration0004,
    snapshotMigration0005,
    snapshotMigration0006,
]

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
