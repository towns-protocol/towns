import React from 'react'
import { staticAssertNever } from 'use-zion-client'
import { Stack } from '@ui'
import { RenderEvent, RenderEventType } from '../util/getEventsByDate'
import { AccumulatedRoomMemberEvent } from './AccumulatedRoomMemberEvent'
import { TimelineGenericEvent } from './TimelineGenericEvent'
import { TimelineMessage } from './TimelineMessage'
import { TimelineThreadUpdates } from './TimelineThreadUpdates'
import { TimelineChannelCreateEvent } from './TimelineChannelCreatedEvent'
import { TimelineEncryptedEvent } from './TimelineEncryptedEvent'

export const MessageTimelineItem = (props: {
    itemData: RenderEvent
    highlight?: boolean
    channelName?: string
    channelEncrypted?: boolean
    userId?: string
}) => {
    const { itemData, channelEncrypted, highlight: isHighlight, channelName, userId } = props

    switch (itemData.type) {
        case RenderEventType.UserMessages: {
            const messagesByUser = itemData.events.map((e, index, events) => {
                return (
                    <TimelineMessage
                        event={e}
                        eventContent={e.content}
                        displayContext={index > 0 ? 'tail' : events.length > 1 ? 'head' : 'single'}
                        key={`${e.eventId}+${e.updatedServerTs ?? e.originServerTs}${
                            e.content.msgType ?? ''
                        }`}
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
                    key={`${e.eventId}+${e.updatedServerTs ?? e.originServerTs}${
                        e.content.msgType ?? ''
                    }`}
                />
            )
        }

        case RenderEventType.AccumulatedRoomMembers: {
            return (
                <AccumulatedRoomMemberEvent
                    event={itemData}
                    key={itemData.key}
                    channelEncrypted={channelEncrypted}
                    channelName={channelName}
                    userId={userId}
                />
            )
        }

        case RenderEventType.RoomMember: {
            return <TimelineGenericEvent event={itemData.event} key={itemData.event.eventId} />
        }

        case RenderEventType.RoomCreate: {
            return <TimelineChannelCreateEvent event={itemData.event} channelName={channelName} />
        }

        case RenderEventType.ThreadUpdate: {
            return <TimelineThreadUpdates events={itemData.events} key={itemData.key} />
        }

        case RenderEventType.EncryptedMessage: {
            return <TimelineEncryptedEvent event={itemData.event} key={itemData.event.eventId} />
        }

        case RenderEventType.FullyRead: {
            return null
        }

        default: {
            staticAssertNever(itemData)
            return null
        }
    }
}
