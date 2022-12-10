import { RoomIdentifier } from '../types/room-identifier'
import { ThreadStats, TimelineEvent, ZTEvent } from '../types/timeline-types'
import { TimelineStoreStates, useTimelineStore } from '../store/use-timeline-store'

export function useTimelineThread(
    roomId: RoomIdentifier,
    eventId?: string,
): { messages: TimelineEvent[]; parent: ThreadStats | undefined } {
    return useTimelineStore((state: TimelineStoreStates) =>
        eventId
            ? {
                  parent:
                      state.threadsStats[roomId.networkId]?.[eventId] ??
                      toDummyThreadStats(
                          state.timelines[roomId.networkId]?.find((e) => e.eventId === eventId),
                      ),
                  messages: state.threads[roomId.networkId]?.[eventId] ?? [],
              }
            : { parent: undefined, messages: [] },
    )
}

function toDummyThreadStats(event?: TimelineEvent) {
    const content = event?.content?.kind === ZTEvent.RoomMessage ? event.content : undefined
    if (!event || !content) {
        return undefined
    }
    return {
        replyCount: 0,
        userIds: new Set<string>(content?.sender.id ? [content?.sender.id] : []),
        latestTs: event.originServerTs,
        parentId: event.eventId,
        parentEvent: event,
        parentMessageContent: content,
    }
}
