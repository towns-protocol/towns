import { useMemo } from 'react'
import { FullyReadMarker } from '@river/proto'
import { useTimelineStore } from '../store/use-timeline-store'
import { ThreadResult, ThreadStats } from '../types/timeline-types'
import { useFullyReadMarkerStore } from '../store/use-fully-read-marker-store'
import { useChannels } from './use-channels'

export function useSpaceThreadRoots(): ThreadResult[] {
    const channels = useChannels()

    const unreadMarkers = useFullyReadMarkerStore((state) => state.markers)
    const threadsStats = useTimelineStore((state) => state.threadsStats)

    return useMemo(() => {
        const threads = [] as ThreadResult[]

        channels.forEach((channel) => {
            const channelThreadStats: Record<string, ThreadStats> =
                threadsStats[channel.id.networkId] || {}

            const channelThreads = Object.values(channelThreadStats)
                .filter((thread) => thread.isParticipating)
                .map((thread) => ({
                    type: 'thread' as const,
                    isNew: isNew(unreadMarkers[thread.parentId]),
                    isUnread: unreadMarkers[thread.parentId]?.isUnread === true,
                    unreadMarker: unreadMarkers[thread.parentId],
                    thread,
                    channel,
                    timestamp: thread.latestTs,
                }))

            threads.push(...channelThreads)
        })

        threads.sort(
            //firstBy<ThreadResult>((m) => (m.isUnread ? 0 : 1)).thenBy((a) => a.timestamp, -1),
            (a: ThreadResult, b: ThreadResult): number => {
                if (a.isUnread && !b.isUnread) {
                    return -1
                } else if (!a.isUnread && b.isUnread) {
                    return 1
                } else if (a.timestamp > b.timestamp) {
                    return -1
                } else if (a.timestamp < b.timestamp) {
                    return 1
                } else {
                    return 0
                }
            },
        )

        return threads
    }, [channels, threadsStats, unreadMarkers])
}

export function useSpaceThreadRootsUnreadCount(): number {
    const roots = useSpaceThreadRoots()
    return roots.filter((t) => t.isUnread).length
}

function isNew(marker?: FullyReadMarker) {
    if (!marker) {
        return false
    }
    const now = Date.now()
    return marker.isUnread || (!marker.isUnread && now - marker.markedReadAtTs < 4000)
}
