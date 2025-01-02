import { useCallback, useRef } from 'react'
import { ThreadStatsData, TimelineEvent } from '../types/timeline-types'
import { TimelineStoreStates, useTimelineStore } from '../store/use-timeline-store'
import { RiverTimelineEvent } from '@river-build/sdk'

const EMPTY_TIMELINE: TimelineEvent[] = []

export function useTimelineThread(
    roomId: string,
    eventId?: string,
): {
    messages: TimelineEvent[]
    parent: ThreadStatsData | undefined
} {
    const dummyThreadStatCache = useRef<Record<string, ThreadStatsData>>({})
    const callback = useCallback(
        (state: TimelineStoreStates) =>
            eventId
                ? {
                      parent:
                          state.threadsStats[roomId]?.[eventId] ??
                          toDummyThreadStats(
                              dummyThreadStatCache,
                              state.timelines[roomId]?.find((e) => e.eventId === eventId),
                          ),
                      messages: state.threads[roomId]?.[eventId] ?? EMPTY_TIMELINE,
                  }
                : { parent: undefined, messages: EMPTY_TIMELINE },
        [eventId, roomId],
    )
    return useTimelineStore(callback)
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
