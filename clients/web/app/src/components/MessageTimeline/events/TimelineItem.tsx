import React from 'react'
import { Stack } from '@ui'
import { TimelineGenericEvent } from './TimelineGenericEvent'
import { TimelineMessage } from './TimelineMessage'
import { RenderEvent, RenderEventType } from '../util/getEventsByDate'
import { TimelineThreadUpdates } from './TimelineThreadUpdates'

export const MessageTimelineItem = (props: { itemData: RenderEvent; highlight?: boolean }) => {
    const { itemData, highlight: isHighlight } = props

    switch (itemData.type) {
        case RenderEventType.UserMessages: {
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

        case RenderEventType.Message: {
            const e = itemData.event
            const displayContext = itemData.displayContext
            return (
                <TimelineMessage
                    highlight={isHighlight}
                    event={e}
                    eventContent={e.content}
                    displayContext={displayContext}
                    key={`${e.eventId}+${e.updatedServerTs ?? e.originServerTs}`}
                />
            )
        }

        case RenderEventType.RoomMember: {
            return <TimelineGenericEvent event={itemData.event} key={itemData.event.eventId} />
        }

        case RenderEventType.RoomCreate: {
            return <TimelineGenericEvent event={itemData.event} key={itemData.event.eventId} />
        }

        case RenderEventType.ThreadUpdate: {
            return <TimelineThreadUpdates events={itemData.events} key={itemData.key} />
        }

        default: {
            return null
        }
    }
}
