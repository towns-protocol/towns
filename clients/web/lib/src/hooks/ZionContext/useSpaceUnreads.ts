import { useEffect, useState } from 'react'
import { FullyReadMarker } from '@river/proto'
import { ZionClient } from '../../client/ZionClient'
import { SpaceHierarchies } from '../../types/zion-types'
import { useFullyReadMarkerStore } from '../../store/use-fully-read-marker-store'
import { ThreadStatsMap, useTimelineStore } from '../../store/use-timeline-store'
import { useSpaceIdStore } from './useSpaceIds'
import isEqual from 'lodash/isEqual'

export function useSpaceUnreads({
    client,
    spaceHierarchies,
    enableSpaceRootUnreads: bShowSpaceRootUnreads,
    mutedChannelIds,
}: {
    client: ZionClient | undefined
    spaceHierarchies: SpaceHierarchies
    enableSpaceRootUnreads: boolean
    mutedChannelIds?: string[]
}) {
    const { spaceIds } = useSpaceIdStore()

    const [state, setState] = useState<{
        spaceUnreads: Record<string, boolean>
        spaceMentions: Record<string, number>
        spaceUnreadChannelIds: Record<string, Set<string>>
    }>({ spaceUnreads: {}, spaceMentions: {}, spaceUnreadChannelIds: {} })

    const threadsStats = useTimelineStore((state) => state.threadsStats)

    useEffect(() => {
        if (!client) {
            return
        }

        // gets run every time spaceIds changes
        // console.log("USE SPACE UNREADS::running effect");
        const updateState = (
            spaceId: string,
            hasUnread: boolean,
            mentions: number,
            unreadChannelIds: Set<string>,
        ) => {
            setState((prev) => {
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
            })
        }

        const runUpdate = () => {
            const markers = useFullyReadMarkerStore.getState().markers
            // note, okay using timeline store without listening to it because I'm
            // mostly certian it's impossible to update the isParticipating without
            // also updating the fullyReadMarkers
            spaceIds.forEach((spaceId) => {
                let hasUnread = false
                let mentionCount = 0
                const unreadChannelIds = new Set<string>()
                // easy case: if the space has a fully read marker, then it's not unread
                if (bShowSpaceRootUnreads && markers[spaceId]?.isUnread === true) {
                    hasUnread = true
                    mentionCount += markers[spaceId].mentions
                }
                // next, check the channels & threads
                const childIds = new Set(spaceHierarchies[spaceId]?.channels.map((x) => x.id) ?? [])
                // count all channels and threads we're patricipating in
                Object.values(markers).forEach((marker) => {
                    if (
                        marker.isUnread &&
                        isParticipatingThread(marker, threadsStats) &&
                        childIds.has(marker.channelId)
                    ) {
                        const isMuted = mutedChannelIds?.includes(marker.channelId)
                        if (!isMuted) {
                            mentionCount += marker.mentions
                            hasUnread = true
                            // dismiss threads when marking channels as unread
                            if (!marker.threadParentId) {
                                unreadChannelIds.add(marker.channelId)
                            }
                        }
                    }
                })

                updateState(spaceId, hasUnread, mentionCount, unreadChannelIds)
            })
        }

        runUpdate()

        const fullyReadUnsub = useFullyReadMarkerStore.subscribe(runUpdate)
        return () => {
            fullyReadUnsub()
        }
    }, [client, spaceIds, spaceHierarchies, bShowSpaceRootUnreads, threadsStats, mutedChannelIds])

    return state
}

const isParticipatingThread = (marker: FullyReadMarker, threadStats: ThreadStatsMap) => {
    // if the thread has no parent, then it's a channel we're participating in
    if (!marker.threadParentId) {
        return true
    }
    const thread = threadStats[marker.channelId]?.[marker.threadParentId]
    return thread?.isParticipating
}
