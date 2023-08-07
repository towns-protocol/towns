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
                      // TODO: Remove or revisit when removing Matrix / Dendrite
                      // something's wrong with the message order in threads, this sort is a quick fix for Aug 7
                      // https://linear.app/hnt-labs/issue/HNT-1873/message-ordering-in-threads-is-inconsistent
                      // https://hntlabs.slack.com/archives/CNY71GGSH/p1690363051419779
                      messages:
                          state.threads[roomId.networkId]?.[eventId]
                              ?.slice()
                              .sort((a, b) => a.originServerTs - b.originServerTs) ??
                          EMPTY_TIMELINE,
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
            latestTs: event.originServerTs,
            parentId: event.eventId,
            parentEvent: event,
            parentMessageContent: content,
            isParticipating: false,
        }
    }
    return cache.current[event.eventId]
}
