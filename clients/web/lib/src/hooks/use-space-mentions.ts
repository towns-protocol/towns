import { useEffect } from 'react'
import { useFullyReadMarkerStore } from '../store/use-fully-read-marker-store'
import { TimelineStore, useRawTimelineStore } from '../store/use-timeline-store'
import isEqual from 'lodash/isEqual'
import debounce from 'lodash/debounce'
import { isChannelStreamId, MentionResult } from '@river-build/sdk'
import { create } from 'zustand'
import { TownsOpts } from 'client/TownsClientTypes'

const useSpaceMentionsStore = create<{
    mentions: MentionResult[]
    unreadThreadCount: number
    unreadChannelCount: number
    setMentions: (mentions: MentionResult[]) => void
}>((set) => ({
    mentions: [],
    unreadThreadCount: 0,
    unreadChannelCount: 0,
    setMentions: (mentions) =>
        set((prev) => {
            if (isEqual(prev.mentions, mentions)) {
                return prev
            }
            const unreadThreadCount = mentions.reduce((count, m) => {
                return m.thread && m.unread ? count + 1 : count
            }, 0)
            const unreadChannelCount = mentions.reduce((count, m) => {
                return !m.thread && m.unread ? count + 1 : count
            }, 0)
            return { mentions, unreadThreadCount, unreadChannelCount }
        }),
}))

export function useCalculateSpaceMentions(_opts: TownsOpts) {
    useEffect(() => {
        const runUpdate = () => {
            const unreadMarkers = useFullyReadMarkerStore.getState().markers
            const threadsStats = useRawTimelineStore.getState().threadsStats
            const timelines = useRawTimelineStore.getState().timelines

            const mentions: MentionResult[] = []

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

            useSpaceMentionsStore.getState().setMentions(mentions)
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
        const unsub2 = useRawTimelineStore.subscribe(onTimelineStoreChange)
        return () => {
            unsub1()
            unsub2()
        }
    }, [])
}

export function useSpaceMentions(): MentionResult[] {
    return useSpaceMentionsStore((state) => state.mentions)
}

export function useSpaceUnreadThreadMentions(): number {
    return useSpaceMentionsStore((state) => state.unreadThreadCount)
}

export function useSpaceUnreadChannelMentions(): number {
    return useSpaceMentionsStore((state) => state.unreadChannelCount)
}
