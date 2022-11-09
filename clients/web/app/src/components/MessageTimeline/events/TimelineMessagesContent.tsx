import React from 'react'
import { Channel, MessageType, RoomMember, RoomMessageEvent, TimelineEvent } from 'use-zion-client'
import { MessageImage } from '@components/MessageImage/MessageImage'
import { MessageZionText } from '../../MessageZionText/MessageZionText'

type Props = {
    event: TimelineEvent
    eventContent: RoomMessageEvent
    members: RoomMember[]
    channels: Channel[]
}

export const TimelineMessageContent = (props: Props) => {
    const { eventContent, event, members, channels } = props

    switch (eventContent.msgType) {
        case MessageType.Image: {
            return <MessageImage content={eventContent.content} />
        }
        case MessageType.ZionText:
        default: {
            return (
                <MessageZionText
                    eventContent={eventContent}
                    event={event}
                    members={members}
                    channels={channels}
                />
            )
        }
    }
}
