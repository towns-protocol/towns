import { firstBy } from 'thenby'
import { Channel } from '../types/matrix-types'
import { useSpaceData } from './use-space-data'
import { useTimelineStore } from '../store/use-timeline-store'
import { FullyReadMarker, ThreadResult, ThreadStats } from '../types/timeline-types'
import { useFullyReadMarkerStore } from '../store/use-fully-read-marker-store'

export function useSpaceThreadRoots(): ThreadResult[] {
    const data = useSpaceData()
    const channelGroups = data?.channelGroups ?? []

    // flatmap channels
    const channels = channelGroups.reduce((channels, group) => {
        return [...channels, ...group.channels]
    }, [] as Channel[])

    const unreadMarkers = useFullyReadMarkerStore((state) => state.markers)
    const threadsStats = useTimelineStore((state) => state.threadsStats)

    const threads = [] as ThreadResult[]

    channels.forEach((channel) => {
        const channelThreadStats: Record<string, ThreadStats> =
            threadsStats[channel.id.matrixRoomId] || {}

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

    threads.sort(firstBy<ThreadResult>((m) => (m.isUnread ? 0 : 1)).thenBy((a) => a.timestamp, -1))

    return threads
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
