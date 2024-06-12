import { useEffect, useState } from 'react'
import { FullyReadMarker } from '@river-build/proto'
import { TownsClient } from '../../client/TownsClient'
import { useFullyReadMarkerStore } from '../../store/use-fully-read-marker-store'
import { ThreadStatsMap, useTimelineStore } from '../../store/use-timeline-store'
import isEqual from 'lodash/isEqual'
import debounce from 'lodash/debounce'
import { isChannelStreamId, spaceIdFromChannelId } from '@river/sdk'
import { useSpaceIdStore } from './useSpaceIds'

export function useSpaceUnreads({
    client,
    mutedChannelIds,
}: {
    client: TownsClient | undefined
    mutedChannelIds?: string[]
}) {
    const [state, setState] = useState<{
        spaceUnreads: Record<string, boolean>
        spaceMentions: Record<string, number>
        spaceUnreadChannelIds: Record<string, Set<string>>
    }>({ spaceUnreads: {}, spaceMentions: {}, spaceUnreadChannelIds: {} })

    const { spaceIds } = useSpaceIdStore()

    useEffect(() => {
        if (!client) {
            return
        }

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
            const threadsStats = useTimelineStore.getState().threadsStats

            const results: Record<
                string,
                { isUnread: boolean; mentions: number; unreadChannelIds: Set<string> }
            > = {}

            // we have lots of markers! loop over the markers just once and build up the state
            // we should transition updating on a delta of markers
            Object.values(markers).forEach((marker) => {
                // only process channel markers
                if (isChannelStreamId(marker.channelId)) {
                    const spaceId = spaceIdFromChannelId(marker.channelId)
                    // only return the unreads from spaceIds in the spaceId store
                    if (spaceIds.includes(spaceId)) {
                        if (!results[spaceId]) {
                            results[spaceId] = {
                                isUnread: false,
                                mentions: 0,
                                unreadChannelIds: new Set(),
                            }
                        }
                        if (marker.isUnread && isParticipatingThread(marker, threadsStats)) {
                            const isMuted = mutedChannelIds?.includes(marker.channelId)
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
                }
            })

            Object.entries(results).forEach(
                ([spaceId, { isUnread, mentions, unreadChannelIds }]) => {
                    updateState(spaceId, isUnread, mentions, unreadChannelIds)
                },
            )
        }

        const debouncedRunUpdate1 = debounce(runUpdate, 250)
        const debouncedRunUpdate2 = debounce(runUpdate, 3000)

        debouncedRunUpdate1()

        const fullyReadUnsub = useFullyReadMarkerStore.subscribe(debouncedRunUpdate1)
        const threadStatsUnsub = useTimelineStore.subscribe(debouncedRunUpdate2)
        return () => {
            debouncedRunUpdate1.cancel()
            debouncedRunUpdate2.cancel()
            fullyReadUnsub()
            threadStatsUnsub()
        }
    }, [client, mutedChannelIds, spaceIds])

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
