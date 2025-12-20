import { Snapshot } from '@towns-protocol/proto'

/**
 * Copies the app address from user stream inception to the stream owner's appAddress field.
 * This enables bot/app identification in member snapshots for DM validation without additional
 * blockchain lookups. When a bot creates its user streams, the appAddress is stored in inception.
 * This migration makes it accessible via the owner's member entry for efficient validation.
 */
export function snapshotMigration0006(snapshot: Snapshot): Snapshot {
    let appAddress: Uint8Array | undefined

    switch (snapshot.content?.case) {
        case 'userContent':
            appAddress = snapshot.content.value.inception?.appAddress
            break
        case 'userSettingsContent':
            appAddress = snapshot.content.value.inception?.appAddress
            break
        case 'userInboxContent':
            appAddress = snapshot.content.value.inception?.appAddress
            break
        case 'userMetadataContent':
            appAddress = snapshot.content.value.inception?.appAddress
            break
        default:
            return snapshot
    }

    if (!appAddress || appAddress.length === 0) {
        return snapshot
    }

    if (snapshot.members && snapshot.members.joined.length > 0) {
        snapshot.members.joined[0].appAddress = appAddress
    }

    return snapshot
}
