import { useMemo } from 'react'
import { firstBy } from 'thenby'
import { Channel, TimelineEvent, ZTEvent, toEvent, useZionContext } from 'use-zion-client'

export const useFilterReplies = (events: TimelineEvent[], bypass = false) => {
    const filteredEvents = useMemo(
        () =>
            bypass
                ? events
                : events.filter(
                      (e: TimelineEvent) =>
                          e.content?.kind !== ZTEvent.RoomMessage || !e.content.inReplyTo,
                  ),
        [bypass, events],
    )

    return { filteredEvents }
}

/**
 * TODO: https://github.com/HereNotThere/harmony/issues/203
 * FIXME: this is an awful shortcut in order to get something on the screen
 * there's a few ways of doing this, by enabling `experimentalThreadSupport` in
 * the client or building a proper reducer looking up parent events recursively
 **/
export const useMessageThread = (messageId: string, channelMessages: TimelineEvent[]) => {
    const parentMessage = useMemo(() => {
        return channelMessages?.find((m) => m.eventId === messageId)
    }, [channelMessages, messageId])

    const messages = channelMessages.reduce((messages, m) => {
        const parentId = m.content?.kind === ZTEvent.RoomMessage && m.content.inReplyTo
        if (parentId === messageId && !messages.some((s) => s.eventId === m.eventId)) {
            messages.push(m)
            return messages
        }
        return messages.sort(firstBy((s) => s.originServerTs))
    }, [] as TimelineEvent[])

    return {
        parentMessage,
        messages,
    }
}

export type ThreadStats = {
    replyCount: number
    userIds: Set<string>
    latestTs: number
    parentId: string
}

export const useTimelineRepliesMap = (events: TimelineEvent[]) => {
    return useMemo(() => getTimelineThreadsMap(events), [events])
}

export const getTimelineThreadsMap = (events: TimelineEvent[]) =>
    events.reduce<Map<string, ThreadStats>>((threads, m) => {
        const parentId = m.content?.kind === ZTEvent.RoomMessage && m.content.inReplyTo
        if (parentId) {
            const entry = threads.get(parentId) ?? {
                replyCount: 0,
                userIds: new Set(),
                latestTs: m.originServerTs,
                parentId,
            }
            entry.replyCount++

            const content = m?.content?.kind === ZTEvent.RoomMessage ? m?.content : undefined

            entry.latestTs = Math.max(entry.latestTs, m.originServerTs)

            if (content) {
                entry.userIds.add(content?.sender.id)
            }
            threads.set(parentId, entry)
        }
        return threads
    }, new Map())

export type MessageRepliesMap = ReturnType<typeof useTimelineRepliesMap>

type ThreadResult = {
    type: 'thread'
    unread: boolean
    thread: ThreadStats
    channel: Channel
    timestamp: number
}

export const useScanChannelThreads = (channels: Channel[], userId: string | null) => {
    const { client } = useZionContext()

    if (userId === null) {
        return { threads: [] }
    }

    const channelTimelineMap = new Map<string, TimelineEvent[]>()
    const threads = [] as ThreadResult[]

    channels.forEach((channel) => {
        const timeline = client?.getRoom(channel.id)?.timeline

        if (!timeline?.length || !userId) return

        let redactedTimeline: TimelineEvent[]

        // could be optimised - only need the segment of the thread
        if (channelTimelineMap.has(channel.id.matrixRoomId)) {
            redactedTimeline = channelTimelineMap.get(channel.id.matrixRoomId) ?? []
        } else {
            redactedTimeline = timeline.filter((e) => !e.isRedacted()).map(toEvent)
            channelTimelineMap.set(channel.id.matrixRoomId, redactedTimeline)
        }

        const channelThreads = Array.from(getTimelineThreadsMap(redactedTimeline).entries())
            .filter(([_parentId, thread]) => thread.userIds.has(userId))
            .map(([_parentId, thread]) => ({
                type: 'thread' as const,
                unread: false,
                thread,
                channel,
                timestamp: thread.latestTs,
            }))

        threads.push(...channelThreads)
    })

    threads.sort(firstBy<ThreadResult>((m) => (m.unread ? 0 : 1)).thenBy((a) => a.timestamp, -1))

    return {
        threads,
    }
}
