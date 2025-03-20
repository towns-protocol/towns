import { useEffect } from 'react'
import { useFullyReadMarkerStore } from '../store/use-fully-read-marker-store'
import { TimelineStore, useRawTimelineStore } from '../store/use-timeline-store'
import isEqual from 'lodash/isEqual'
import debounce from 'lodash/debounce'
import { isChannelStreamId, MentionResult, spaceIdFromChannelId } from '@towns-protocol/sdk'
import { create } from 'zustand'
import { TownsOpts } from 'client/TownsClientTypes'

interface MentionsStore {
    mentionsMap: Record<
        string,
        {
            mentions: MentionResult[]
            unreadThreadCount: number
            unreadChannelCount: number
        }
    >
    setMentions: (spaceId: string, mentions: MentionResult[]) => void
}

const useSpaceMentionsStore = create<MentionsStore>((set) => ({
    mentionsMap: {},
    setMentions: (spaceId: string, mentions: MentionResult[]) =>
        set((prev) => {
            if (isEqual(prev.mentionsMap[spaceId]?.mentions, mentions)) {
                return prev
            }
            const unreadThreadCount = mentions.reduce((count, m) => {
                return m.thread && m.unread ? count + 1 : count
            }, 0)
            const unreadChannelCount = mentions.reduce((count, m) => {
                return !m.thread && m.unread ? count + 1 : count
            }, 0)
            const next = { mentions, unreadThreadCount, unreadChannelCount }
            return { mentionsMap: { ...prev.mentionsMap, [spaceId]: next } }
        }),
}))

export function useCalculateSpaceMentions(_opts: TownsOpts) {
    useEffect(() => {
        const runUpdate = () => {
            const unreadMarkers = useFullyReadMarkerStore.getState().markers
            const threadsStats = useRawTimelineStore.getState().threadsStats
            const timelines = useRawTimelineStore.getState().timelines

            const mentionsMap: Record<string, MentionResult[]> = {}

            for (const [streamId, timeline] of Object.entries(timelines)) {
                if (!isChannelStreamId(streamId)) {
                    continue
                }
                const channelId = streamId
                const spaceId = spaceIdFromChannelId(channelId)
                if (!timeline?.length) {
                    return
                }

                let mentions = mentionsMap[spaceId]
                if (!mentions) {
                    mentions = []
                    mentionsMap[spaceId] = mentions
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

            for (const [spaceId, mentions] of Object.entries(mentionsMap)) {
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
                useSpaceMentionsStore.getState().setMentions(spaceId, mentions)
            }
        }

        const debouncedRunUpdate = debounce(runUpdate, 2000, { maxWait: 2000 })

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

const emptyMentionsResult: MentionResult[] = []
export function useSpaceMentions(spaceId: string | undefined): MentionResult[] {
    return useSpaceMentionsStore((state) =>
        spaceId ? state.mentionsMap[spaceId]?.mentions ?? emptyMentionsResult : emptyMentionsResult,
    )
}

export function useSpaceUnreadThreadMentions(spaceId: string | undefined): number {
    return useSpaceMentionsStore((state) =>
        spaceId ? state.mentionsMap[spaceId]?.unreadThreadCount ?? 0 : 0,
    )
}

export function useSpaceUnreadChannelMentions(spaceId: string | undefined): number {
    return useSpaceMentionsStore((state) =>
        spaceId ? state.mentionsMap[spaceId]?.unreadChannelCount ?? 0 : 0,
    )
}
