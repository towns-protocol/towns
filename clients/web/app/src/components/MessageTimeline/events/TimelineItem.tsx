import React, { useContext } from 'react'
import { staticAssertNever } from 'use-zion-client'
import { MessageTimelineContext } from '../MessageTimelineContext'
import { RenderEvent, RenderEventType } from '../util/getEventsByDate'
import { AccumulatedRoomMemberEvent } from './AccumulatedRoomMemberEvent'
import { TimelineChannelCreateEvent } from './TimelineChannelCreatedEvent'
import { TimelineGenericEvent } from './TimelineGenericEvent'
import { TimelineMessage } from './TimelineMessage'
import { TimelineMessageEditor } from './TimelineMessageEditor'
import { TimelineEncryptedContent, TimelineMessageContent } from './TimelineMessagesContent'
import { TimelineThreadUpdates } from './TimelineThreadUpdates'

export const MessageTimelineItem = (props: {
    itemData: RenderEvent
    highlight?: boolean
    channelName?: string
    channelEncrypted?: boolean
    userId?: string
}) => {
    const { itemData, channelEncrypted, highlight: isHighlight, channelName, userId } = props

    const timelineContext = useContext(MessageTimelineContext)

    if (!timelineContext) {
        return <></>
    }

    const { channels, members, channelId, timelineActions } = timelineContext

    switch (itemData.type) {
        case RenderEventType.EncryptedMessage:
        case RenderEventType.Message: {
            const event = itemData.event

            const isMessage = itemData.type === RenderEventType.Message

            const displayEncrypted =
                itemData.type === RenderEventType.EncryptedMessage || itemData.displayEncrypted

            const displayContext = isMessage ? itemData.displayContext : 'single'
            const isEditing = event.eventId === timelineActions.editingMessageId
            const isSelectable = !displayEncrypted

            const msgTypeKey = isMessage ? itemData.event.content.msgType ?? '' : ''

            return (
                <TimelineMessage
                    highlight={isHighlight}
                    event={event}
                    selectable={isSelectable}
                    displayContext={displayContext}
                    key={`${event.eventId}${
                        event.updatedServerTs ?? event.originServerTs
                    }${msgTypeKey}`}
                >
                    {displayEncrypted ? (
                        <TimelineEncryptedContent event={event} displayContext={displayContext} />
                    ) : isEditing ? (
                        <TimelineMessageEditor
                            initialValue={itemData.event.content.body}
                            eventId={event.eventId}
                            channelId={channelId}
                        />
                    ) : (
                        <TimelineMessageContent
                            event={event}
                            eventContent={itemData.event.content}
                            members={members}
                            channels={channels}
                        />
                    )}
                </TimelineMessage>
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

        case RenderEventType.FullyRead: {
            return null
        }

        case RenderEventType.UserMessages: {
            /* UserMessages (grouped per user) are flatmapped into Message events */
            return null
        }

        default: {
            staticAssertNever(itemData)
            return null
        }
    }
}
