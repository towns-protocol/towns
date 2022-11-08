import { useMemo } from 'react'
import { firstBy } from 'thenby'
import { TimelineEvent, ZTEvent } from 'use-zion-client'

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
        return channelMessages?.find(
            (m) =>
                m.eventId === messageId ||
                (m.content?.kind === ZTEvent.RoomMessage &&
                    m.content.content['m.relates_to']?.['rel_type'] === 'm.replace' &&
                    m.content.content['m.relates_to']?.event_id === messageId),
        )
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
