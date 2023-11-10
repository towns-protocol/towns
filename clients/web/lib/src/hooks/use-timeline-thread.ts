import { useCallback, useRef } from 'react'
import { RoomIdentifier } from '../types/room-identifier'
import { ThreadStats, TimelineEvent, ZTEvent } from '../types/timeline-types'
import { TimelineStoreStates, useTimelineStore } from '../store/use-timeline-store'

const EMPTY_TIMELINE: TimelineEvent[] = []

export function useTimelineThread(
    roomId: RoomIdentifier,
    eventId?: string,
): {
    messages: TimelineEvent[]
    parent: ThreadStats | undefined
} {
    const dummyThreadStatCache = useRef<Record<string, ThreadStats>>({})
    const callback = useCallback(
        (state: TimelineStoreStates) =>
            eventId
                ? {
                      parent:
                          state.threadsStats[roomId.networkId]?.[eventId] ??
                          toDummyThreadStats(
                              dummyThreadStatCache,
                              state.timelines[roomId.networkId]?.find((e) => e.eventId === eventId),
                          ),
                      messages: state.threads[roomId.networkId]?.[eventId] ?? EMPTY_TIMELINE,
                  }
                : { parent: undefined, messages: EMPTY_TIMELINE },
        [eventId, roomId.networkId],
    )
    return useTimelineStore(callback)
}

function toDummyThreadStats(
    cache: React.MutableRefObject<Record<string, ThreadStats>>,
    event?: TimelineEvent,
): ThreadStats | undefined {
    const content = event?.content?.kind === ZTEvent.RoomMessage ? event.content : undefined
    if (!event || !content) {
        return undefined
    }
    if (!cache.current[event.eventId]) {
        cache.current[event.eventId] = {
            replyCount: 0,
            userIds: new Set<string>(event.sender.id ? [event.sender.id] : []),
            latestTs: event.createdAtEpocMs,
            parentId: event.eventId,
            parentEvent: event,
            parentMessageContent: content,
            isParticipating: false,
        }
    }
    return cache.current[event.eventId]
}
