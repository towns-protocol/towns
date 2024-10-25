import { useEffect, useMemo, useState } from 'react'
import { useFullyReadMarkerStore } from '../store/use-fully-read-marker-store'
import { TimelineStore, useTimelineStore } from '../store/use-timeline-store'
import { MentionResult } from '../types/timeline-types'
import isEqual from 'lodash/isEqual'
import debounce from 'lodash/debounce'
import { isChannelStreamId } from '@river-build/sdk'

export function useSpaceMentions(): MentionResult[] {
    const [mentions, setMentions] = useState<MentionResult[]>([])

    useEffect(() => {
        const runUpdate = () => {
            const unreadMarkers = useFullyReadMarkerStore.getState().markers
            const threadsStats = useTimelineStore.getState().threadsStats
            const timelines = useTimelineStore.getState().timelines

            const mentions = [] as MentionResult[]

            for (const [streamId, timeline] of Object.entries(timelines)) {
                if (!isChannelStreamId(streamId)) {
                    continue
                }
                const channelId = streamId
                if (!timeline?.length) {
                    return
                }

                const channelMentions = timeline
                    .filter((event) => event.isMentioned)
                    .map((event) => {
                        const threadStat = event.threadParentId
                            ? threadsStats[channelId]?.[event.threadParentId]
                            : undefined
                        const fullyReadMarker = unreadMarkers[event.threadParentId ?? channelId]
                        return {
                            type: 'mention' as const,
                            unread:
                                fullyReadMarker?.isUnread === true &&
                                event.eventNum >= fullyReadMarker.eventNum,
                            channelId,
                            timestamp: event.createdAtEpochMs,
                            event,
                            thread: threadStat?.parentEvent,
                        }
                    })
                mentions.push(...channelMentions)
            }

            mentions.sort(
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

            setMentions((prev) => (isEqual(prev, mentions) ? prev : mentions))
        }

        const debouncedRunUpdate = debounce(runUpdate, 2000)

        const onTimelineStoreChange = (state: TimelineStore, prevState: TimelineStore) => {
            if (
                state.threadsStats !== prevState.threadsStats ||
                state.timelines !== prevState.timelines
            ) {
                debouncedRunUpdate()
            }
        }

        runUpdate()

        const unsub1 = useFullyReadMarkerStore.subscribe(debouncedRunUpdate)
        const unsub2 = useTimelineStore.subscribe(onTimelineStoreChange)
        return () => {
            unsub1()
            unsub2()
        }
    }, [mentions])

    return mentions
}

export function useSpaceUnreadThreadMentions(mentions: MentionResult[]): number {
    return useMemo(
        () =>
            mentions.reduce((count, m) => {
                return m.thread && m.unread ? count + 1 : count
            }, 0),
        [mentions],
    )
}
