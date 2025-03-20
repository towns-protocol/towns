import { useCallback, useRef } from 'react'
import { ThreadStatsData } from '../types/timeline-types'
import { TimelineStoreStates, useRawTimelineStore } from '../store/use-timeline-store'
import { RiverTimelineEvent, TimelineEvent } from '@towns-protocol/sdk'
import { useShallow } from 'zustand/react/shallow'
const EMPTY_TIMELINE: TimelineEvent[] = []

export function useTimelineThread(
    roomId: string,
    eventId?: string,
): {
    messages: TimelineEvent[]
    threadData: ThreadStatsData | undefined
} {
    const dummyThreadStatCache = useRef<Record<string, ThreadStatsData>>({})
    const callback = useCallback(
        (state: TimelineStoreStates) =>
            eventId
                ? {
                      threadData:
                          state.threadsStats[roomId]?.[eventId] ??
                          toDummyThreadStats(
                              dummyThreadStatCache,
                              state.timelines[roomId]?.find((e) => e.eventId === eventId),
                          ),
                      messages: state.threads[roomId]?.[eventId] ?? EMPTY_TIMELINE,
                  }
                : { threadData: undefined, messages: EMPTY_TIMELINE },
        [eventId, roomId],
    )
    return useRawTimelineStore(useShallow(callback))
}

function toDummyThreadStats(
    cache: React.MutableRefObject<Record<string, ThreadStatsData>>,
    event?: TimelineEvent,
): ThreadStatsData | undefined {
    const content =
        event?.content?.kind === RiverTimelineEvent.ChannelMessage ? event.content : undefined
    if (!event || !content) {
        return undefined
    }
    if (!cache.current[event.eventId]) {
        cache.current[event.eventId] = {
            replyEventIds: new Set(),
            userIds: new Set<string>(event.sender.id ? [event.sender.id] : []),
            latestTs: event.createdAtEpochMs,
            parentId: event.eventId,
            parentEvent: event,
            parentMessageContent: content,
            isParticipating: false,
        }
    }
    return cache.current[event.eventId]
}
