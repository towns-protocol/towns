import { FullyReadMarker, GetSettingsResponse } from '@towns-protocol/proto'
import { UnreadMarkersModel } from '../streams/unreadMarkersTransform'
import { getMutedChannelIds } from '../../notificationsClient'
import { isEqual } from 'lodash-es'
import { ThreadStatsMap, TimelinesViewModel } from '../streams/timelinesModel'
import { isChannelStreamId, spaceIdFromChannelId } from '../../id'

export interface SpaceUnreadsModel {
    spaceUnreads: Record<string, boolean>
    spaceMentions: Record<string, number>
    spaceUnreadChannelIds: Record<string, Set<string>>
}

interface Input {
    notificationSettings: GetSettingsResponse | undefined
    timelinesView: TimelinesViewModel
    myUnreadMarkers: UnreadMarkersModel
}

export function spaceUnreadsTransform(
    input: Input,
    _prevInput: Input,
    prev?: SpaceUnreadsModel,
): SpaceUnreadsModel {
    const { myUnreadMarkers, timelinesView, notificationSettings } = input
    const mutedChannelIds = getMutedChannelIds(notificationSettings)

    let next =
        prev ??
        ({
            spaceUnreads: {},
            spaceMentions: {},
            spaceUnreadChannelIds: {},
        } satisfies SpaceUnreadsModel)

    const updateState = (
        spaceId: string,
        hasUnread: boolean,
        mentions: number,
        unreadChannelIds: Set<string>,
        prev: SpaceUnreadsModel,
    ) => {
        const unreadChannelIdsArray = new Set(unreadChannelIds)

        const channelIdsAreEqual = isEqual(
            prev.spaceUnreadChannelIds[spaceId],
            unreadChannelIdsArray,
        )
        if (
            prev.spaceUnreads[spaceId] === hasUnread &&
            prev.spaceMentions[spaceId] === mentions &&
            channelIdsAreEqual
        ) {
            return prev
        }
        const spaceUnreads =
            prev.spaceUnreads[spaceId] === hasUnread
                ? prev.spaceUnreads
                : { ...prev.spaceUnreads, [spaceId]: hasUnread }
        const spaceMentions =
            prev.spaceMentions[spaceId] === mentions
                ? prev.spaceMentions
                : { ...prev.spaceMentions, [spaceId]: mentions }
        const spaceUnreadChannelIds = channelIdsAreEqual
            ? prev.spaceUnreadChannelIds
            : { ...prev.spaceUnreadChannelIds, [spaceId]: unreadChannelIdsArray }

        return {
            spaceUnreads,
            spaceMentions,
            spaceUnreadChannelIds,
        }
    }

    const markers = myUnreadMarkers.markers
    const threadsStats = timelinesView.threadsStats

    const results: Record<
        string,
        { isUnread: boolean; mentions: number; unreadChannelIds: Set<string> }
    > = {}

    // we have lots of markers! loop over the markers just once and build up the state
    // we should transition updating on a delta of markers
    Object.entries(markers).forEach(([key, marker]) => {
        // fixes symptoms of HNT-10960 by filtering out markers with
        // empty keys. We should be able to remove this once the root
        // cause has been in production for a while.
        if (!key) {
            return
        }

        // only process channel markers
        if (isChannelStreamId(marker.channelId)) {
            const spaceId = spaceIdFromChannelId(marker.channelId)
            // only return the unreads from spaceIds in the spaceId store

            if (!results[spaceId]) {
                results[spaceId] = {
                    isUnread: false,
                    mentions: 0,
                    unreadChannelIds: new Set(),
                }
            }
            if (marker.isUnread && isParticipatingThread(marker, threadsStats)) {
                const isMuted =
                    mutedChannelIds?.has(marker.channelId) || mutedChannelIds?.has(spaceId)

                if (!isMuted) {
                    results[spaceId].mentions += marker.mentions
                    results[spaceId].isUnread = true
                    // dismiss threads when marking channels as unread
                    if (!marker.threadParentId) {
                        results[spaceId].unreadChannelIds.add(marker.channelId)
                    }
                }
            }
        }
    })

    Object.entries(results).forEach(([spaceId, { isUnread, mentions, unreadChannelIds }]) => {
        next = updateState(spaceId, isUnread, mentions, unreadChannelIds, next)
    })
    return next
}

const isParticipatingThread = (marker: FullyReadMarker, threadStats: ThreadStatsMap) => {
    // if the thread has no parent, then it's a channel we're participating in
    if (!marker.threadParentId) {
        return true
    }
    const thread = threadStats[marker.channelId]?.[marker.threadParentId]
    return thread?.isParticipating
}
