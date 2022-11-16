import { firstBy } from 'thenby'
import { Channel, ThreadResult } from '../types/matrix-types'
import { useSpaceData } from './use-space-data'
import { useTimelineStore } from '../store/use-timeline-store'
import { ThreadStats } from '../types/timeline-types'

export function useSpaceThreadRoots(): ThreadResult[] {
    const data = useSpaceData()
    const channelGroups = data?.channelGroups ?? []

    // flatmap channels
    const channels = channelGroups.reduce((channels, group) => {
        return [...channels, ...group.channels]
    }, [] as Channel[])

    const threadsStats = useTimelineStore((state) => state.threadsStats)

    const threads = [] as ThreadResult[]

    channels.forEach((channel) => {
        const channelThreadStats: Record<string, ThreadStats> =
            threadsStats[channel.id.matrixRoomId] || {}

        const channelThreads = Object.values(channelThreadStats)
            .filter((thread) => thread.isParticipating)
            .map((thread) => ({
                type: 'thread' as const,
                unread: false,
                thread,
                channel,
                timestamp: thread.latestTs,
            }))

        threads.push(...channelThreads)
    })

    threads.sort(firstBy<ThreadResult>((m) => (m.unread ? 0 : 1)).thenBy((a) => a.timestamp, -1))

    return threads
}
