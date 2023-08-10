import React from 'react'
import { staticAssertNever } from 'use-zion-client'
import { AccumulatedRoomMemberEvent } from './items/AccumulatedMembers'
import { TimelineChannelCreateEvent } from './items/ChannelCreated'
import { TimelineGenericEvent } from './items/GenericItem'
import { MessageItem } from './items/MessageItem/MessageItem'
import { TimelineThreadUpdates } from './items/ThreadUpdates'
import { RenderEvent, RenderEventType } from '../MessageTimeline/util/getEventsByDate'

export const MessageTimelineItem = React.memo(
    (props: {
        itemData: RenderEvent
        highlight?: boolean
        channelName?: string
        channelEncrypted?: boolean
        userId?: string
    }) => {
        const { itemData, channelEncrypted, highlight: isHighlight, channelName, userId } = props

        switch (itemData.type) {
            case RenderEventType.EncryptedMessage:
            case RenderEventType.RedactedMessage:
            case RenderEventType.Message: {
                return (
                    <MessageItem itemData={itemData} key={itemData.key} isHighlight={isHighlight} />
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
                return (
                    <TimelineChannelCreateEvent event={itemData.event} channelName={channelName} />
                )
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
    },
)
