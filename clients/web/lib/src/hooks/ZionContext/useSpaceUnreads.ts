import { useEffect, useState } from 'react'
import { ZionClient } from '../../client/ZionClient'
import { SpaceHierarchies } from '../../types/zion-types'
import { useFullyReadMarkerStore } from '../../store/use-fully-read-marker-store'
import { useTimelineStore } from '../../store/use-timeline-store'
import { useSpaceIdStore } from './useSpaceIds'

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
            const threadStats = useTimelineStore.getState().threadsStats
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
                        (!marker.threadParentId ||
                            threadStats[marker.channelId.networkId]?.[marker.threadParentId]
                                ?.isParticipating === true) &&
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
    }, [client, spaceIds, spaceHierarchies, bShowSpaceRootUnreads])

    return state
}
