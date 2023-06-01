import { useEffect, useState } from 'react'
import { ZionClient } from '../../client/ZionClient'
import { SpaceHierarchies } from '../../types/zion-types'
import { useFullyReadMarkerStore } from '../../store/use-fully-read-marker-store'
import { ThreadStatsMap, useTimelineStore } from '../../store/use-timeline-store'
import { useSpaceIdStore } from './useSpaceIds'
import { FullyReadMarker } from 'types/timeline-types'

export function useSpaceUnreads(
    client: ZionClient | undefined,
    spaceHierarchies: SpaceHierarchies,
    bShowSpaceRootUnreads: boolean,
) {
    const { spaceIds } = useSpaceIdStore()

    const [state, setState] = useState<{
        spaceUnreads: Record<string, boolean>
        spaceMentions: Record<string, number>
    }>({ spaceUnreads: {}, spaceMentions: {} })

    const threadsStats = useTimelineStore((state) => state.threadsStats)

    useEffect(() => {
        if (!client) {
            return
        }

        // gets run every time spaceIds changes
        // console.log("USE SPACE UNREADS::running effect");
        const updateState = (spaceId: string, hasUnread: boolean, mentions: number) => {
            setState((prev) => {
                if (
                    prev.spaceUnreads[spaceId] === hasUnread &&
                    prev.spaceMentions[spaceId] === mentions
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
                return {
                    spaceUnreads,
                    spaceMentions,
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
                // easy case: if the space has a fully read marker, then it's not unread
                if (bShowSpaceRootUnreads && markers[spaceId.networkId]?.isUnread === true) {
                    hasUnread = true
                    mentionCount += markers[spaceId.networkId].mentions
                }
                // next, check the channels & threads
                const childIds = new Set(
                    spaceHierarchies[spaceId.networkId]?.children.map((x) => x.id.networkId) ?? [],
                )
                // count all channels and threads we're patricipating in
                Object.values(markers).forEach((marker) => {
                    if (
                        marker.isUnread &&
                        isParticipatingThread(marker, threadsStats) &&
                        childIds.has(marker.channelId.networkId)
                    ) {
                        hasUnread = true
                        mentionCount += marker.mentions
                    }
                })

                updateState(spaceId.networkId, hasUnread, mentionCount)
            })
        }

        runUpdate()

        const fullyReadUnsub = useFullyReadMarkerStore.subscribe(runUpdate)
        return () => {
            fullyReadUnsub()
        }
    }, [client, spaceIds, spaceHierarchies, bShowSpaceRootUnreads, threadsStats])

    return state
}

const isParticipatingThread = (marker: FullyReadMarker, threadStats: ThreadStatsMap) => {
    // if the thread has no parent, then it's a channel we're participating in
    if (!marker.threadParentId) {
        return true
    }

    const thread = threadStats[marker.channelId.networkId]?.[marker.threadParentId]

    // skip unreads for deleted threads
    if (!thread?.parentEvent) {
        return false
    }

    return thread?.isParticipating
}
