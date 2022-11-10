import { useMemo } from 'react'
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
