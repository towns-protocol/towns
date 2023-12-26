import { useMemo } from 'react'
import { useFullyReadMarkerStore } from '../store/use-fully-read-marker-store'
import { useTimelineStore } from '../store/use-timeline-store'
import { MentionResult } from '../types/timeline-types'
import { useChannels } from './use-channels'

export function useSpaceMentions(): MentionResult[] {
    const unreadMarkers = useFullyReadMarkerStore((state) => state.markers)
    const { threadsStats, timelines } = useTimelineStore((state) => ({
        threadsStats: state.threadsStats,
        timelines: state.timelines,
    }))

    const channels = useChannels()

    return useMemo(() => {
        const mentions = [] as MentionResult[]

        channels.forEach((channel) => {
            const timeline = timelines[channel.id]
            if (!timeline?.length) {
                return
            }

            const channelMentions = timeline
                .filter((event) => event.isMentioned)
                .map((event) => {
                    const threadStat = event.threadParentId
                        ? threadsStats[channel.id]?.[event.threadParentId]
                        : undefined
                    const fullyReadMarker = unreadMarkers[event.threadParentId ?? channel.id]
                    return {
                        type: 'mention' as const,
                        unread:
                            fullyReadMarker?.isUnread === true &&
                            event.eventNum >= fullyReadMarker.eventNum,
                        channel,
                        timestamp: event.createdAtEpocMs,
                        event,
                        thread: threadStat?.parentEvent,
                    }
                })
            mentions.push(...channelMentions)
        })

        return mentions.sort(
            //firstBy<MentionResult>((m) => (m.unread ? 0 : 1)).thenBy((a) => a.timestamp, -1),
            (a: MentionResult, b: MentionResult): number => {
                if (a.unread && !b.unread) {
                    return -1
                } else if (!a.unread && b.unread) {
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
    }, [channels, threadsStats, timelines, unreadMarkers])
}

export function useSpaceUnreadThreadMentions(): number {
    const mentions = useSpaceMentions()
    return mentions.reduce((count, m) => {
        return m.thread && m.unread ? count + 1 : count
    }, 0)
}
