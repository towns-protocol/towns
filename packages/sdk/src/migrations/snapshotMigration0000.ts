import { Snapshot } from '@towns-protocol/proto'

// a no-op migration for the initial snapshot, use as a template for new migrations
export function snapshotMigration0000(snapshot: Snapshot): Snapshot {
    return snapshot
}
