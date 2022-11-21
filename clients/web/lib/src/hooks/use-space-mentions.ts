import { firstBy } from 'thenby'
import { useFullyReadMarkerStore } from '../store/use-fully-read-marker-store'
import { useTimelineStore } from '../store/use-timeline-store'
import { Channel } from '../types/matrix-types'
import { MentionResult } from '../types/timeline-types'
import { useSpaceData } from './use-space-data'

export function useSpaceMentions(): MentionResult[] {
    // this would be much more effecient if it was saved off in the useMatrixTimelines hook...
    const data = useSpaceData()
    const channelGroups = data?.channelGroups ?? []

    // flatmap channels
    const channels = channelGroups.reduce((channels, group) => {
        return [...channels, ...group.channels]
    }, [] as Channel[])

    const unreadMarkers = useFullyReadMarkerStore((state) => state.markers)
    const { threadsStats, timelines } = useTimelineStore((state) => ({
        threadsStats: state.threadsStats,
        timelines: state.timelines,
    }))

    const mentions = [] as MentionResult[]

    channels.forEach((channel) => {
        const timeline = timelines[channel.id.matrixRoomId]
        if (!timeline?.length) {
            return
        }

        const channelMentions = timeline
            .filter((event) => event.isMentioned)
            .map((event) => {
                const threadStat = event.threadParentId
                    ? threadsStats[channel.id.matrixRoomId]?.[event.threadParentId]
                    : undefined
                const fullyReadMarker =
                    unreadMarkers[event.threadParentId ?? channel.id.matrixRoomId]
                return {
                    type: 'mention' as const,
                    unread:
                        fullyReadMarker?.isUnread === true &&
                        // aellis 11.2022, not sure if we can acutately compare these two dates
                        // one comes from the server, the other the client. If it's buggy, it should be possible to
                        // grab the originServerTs on the last marked read event and compare that
                        event.originServerTs > fullyReadMarker.markedReadAtTs,
                    channel,
                    timestamp: event.originServerTs,
                    event,
                    thread: threadStat?.parentEvent,
                }
            })
        mentions.push(...channelMentions)
    })

    return mentions.sort(
        firstBy<MentionResult>((m) => (m.unread ? 0 : 1)).thenBy((a) => a.timestamp, -1),
    )
}
