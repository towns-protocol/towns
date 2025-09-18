import { bin_toHexString, dlogger } from '@towns-protocol/utils'
import { Snapshot, SnapshotSchema } from '@towns-protocol/proto'
import { SpaceIdFromSpaceAddress } from '@towns-protocol/web3'
import { toBinary } from '@bufbuild/protobuf'

const logger = dlogger('csb:snapshotMigration0005')
const LOG_SIZE_REDUCTION = false
/**
 * One time fix migration to remove lost sessionIds from key solicitations
 * Loop over all Member objects, count sessionIds across solicitations
 * and log those appearing in get 5% of members, checking if they map to
 * username or display_name encrypted payloads
 */
export function snapshotMigration0005(snapshot: Snapshot, force: boolean = false): Snapshot {
    if (!snapshot.members?.joined?.length || (snapshot.members.joined.length < 500 && !force)) {
        return snapshot
    }

    const members = snapshot.members.joined
    const sessionIdCounts = new Map<string, number>()
    const memberCount = members.length
    const threshold = Math.max(memberCount / 20, 2) // 5% threshold, minimum 2 for testing

    for (const member of members) {
        if (!member.solicitations?.length) {
            continue
        }
        for (const solicitation of member.solicitations) {
            if (!solicitation.sessionIds?.length) {
                continue
            }
            for (const sessionId of solicitation.sessionIds) {
                sessionIdCounts.set(sessionId, (sessionIdCounts.get(sessionId) || 0) + 1)
            }
        }
    }

    const lostSessionIds = Array.from(sessionIdCounts.entries())
        .filter(([_, count]) => count > threshold)
        .map(([id]) => id)

    if (lostSessionIds.length) {
        const lostSessionIdsSet = new Set(lostSessionIds)
        const before = LOG_SIZE_REDUCTION ? toBinary(SnapshotSchema, snapshot).length : undefined

        let numRemove = 0
        let usernamesCleared = 0
        let displayNamesCleared = 0
        for (const member of members) {
            // Remove all lost sessionIds from member's solicitations
            for (const solicitation of member.solicitations) {
                const before = solicitation.sessionIds.length
                solicitation.sessionIds = solicitation.sessionIds.filter(
                    (id) => !lostSessionIdsSet.has(id),
                )
                const after = solicitation.sessionIds.length
                numRemove += before - after
            }
            // Remove empty solicitations
            member.solicitations = member.solicitations.filter(
                (solicitation) => solicitation.sessionIds.length > 0,
            )
            // Clear lost user and display names
            if (
                member.displayName?.data?.sessionId &&
                lostSessionIdsSet.has(member.displayName.data.sessionId)
            ) {
                member.displayName = undefined
                displayNamesCleared++
            }
            if (
                member.displayName?.data?.sessionIdBytes &&
                member.displayName.data.sessionIdBytes.length > 0 &&
                lostSessionIdsSet.has(bin_toHexString(member.displayName.data.sessionIdBytes))
            ) {
                member.displayName = undefined
                displayNamesCleared++
            }
            if (
                member.username?.data?.sessionId &&
                lostSessionIdsSet.has(member.username.data.sessionId)
            ) {
                member.username = undefined
                usernamesCleared++
            }
            if (
                member.username?.data?.sessionIdBytes &&
                member.username.data.sessionIdBytes.length > 0 &&
                lostSessionIdsSet.has(bin_toHexString(member.username.data.sessionIdBytes))
            ) {
                member.username = undefined
                usernamesCleared++
            }
        }
        const streamIdBytes = snapshot.content.value?.inception?.streamId
        const streamId = streamIdBytes ? bin_toHexString(streamIdBytes) : ''
        const spaceAddress = SpaceIdFromSpaceAddress(streamId)
        const after = LOG_SIZE_REDUCTION ? toBinary(SnapshotSchema, snapshot).length : undefined
        const mbSaved = before && after ? (before - after) / 1024 / 1024 : undefined
        const sizeLog =
            before && after && mbSaved
                ? `Snapshot size reduced from ${before} to ${after}, ${mbSaved.toFixed(2)} MB saved`
                : ''
        logger.info(
            `${spaceAddress} ${sizeLog} ${numRemove} sessionIds ${usernamesCleared} usernames and ${displayNamesCleared} display names removed`,
        )
    }

    return snapshot
}
