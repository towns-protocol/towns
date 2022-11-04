import { useMemo } from 'react'
import { firstBy } from 'thenby'
import { Channel, ThreadStats, TimelineEvent, ZTEvent, useTimelineStore } from 'use-zion-client'

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

type ThreadResult = {
    type: 'thread'
    unread: boolean
    thread: ThreadStats
    channel: Channel
    timestamp: number
}

export const useScanChannelThreads = (channels: Channel[], userId: string | null) => {
    const threadsStats = useTimelineStore((state) => state.threadsStats)

    if (userId === null) {
        return { threads: [] }
    }

    const threads = [] as ThreadResult[]

    channels.forEach((channel) => {
        const channelThreadStats: Record<string, ThreadStats> =
            threadsStats[channel.id.matrixRoomId] || {}

        const channelThreads = Object.values(channelThreadStats)
            .filter((thread) => thread.userIds.has(userId))
            .map((thread) => ({
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
