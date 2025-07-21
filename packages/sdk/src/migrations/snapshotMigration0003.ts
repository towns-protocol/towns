import { Snapshot } from '@towns-protocol/proto'

/**
 * Zero out the tips sent and received since we're adding counts and we want them to match
 */
export function snapshotMigration0003(snapshot: Snapshot): Snapshot {
    switch (snapshot.content?.case) {
        case 'userContent': {
            snapshot.content.value.tipsSent = {}
            snapshot.content.value.tipsReceived = {}
            snapshot.content.value.tipsSentCount = {}
            snapshot.content.value.tipsReceivedCount = {}
        }
    }
    return snapshot
}
