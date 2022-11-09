import React from 'react'
import { Stack } from '@ui'
import { TimelineGenericEvent } from './TimelineGenericEvent'
import { TimelineMessage } from './TimelineMessage'
import { RenderEvent, RenderEventType } from '../hooks/useGroupEvents'

export const MessageTimelineItem = (props: { itemData: RenderEvent }) => {
    const { itemData } = props

    switch (itemData.type) {
        case RenderEventType.UserMessageGroup: {
            const messagesByUser = itemData.events.map((e, index, events) => {
                return (
                    <TimelineMessage
                        event={e}
                        eventContent={e.content}
                        displayContext={index > 0 ? 'tail' : events.length > 1 ? 'head' : 'single'}
                        key={`${e.eventId}+${e.updatedServerTs ?? e.originServerTs}`}
                    />
                )
            })
            const key = itemData.events[0]?.eventId
            return <Stack key={key}>{messagesByUser}</Stack>
        }

        case RenderEventType.RoomMember: {
            return <TimelineGenericEvent event={itemData.event} key={itemData.event.eventId} />
        }

        case RenderEventType.RoomCreate: {
            return <TimelineGenericEvent event={itemData.event} key={itemData.event.eventId} />
        }

        default: {
            return null
        }
    }
}
