import React from 'react'
import { Channel, MessageType, RoomMember, RoomMessageEvent, TimelineEvent } from 'use-zion-client'
import { RatioedBackgroundImage } from '@components/RatioedBackgroundImage'
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
            return (
                <RatioedBackgroundImage
                    withLinkOut
                    url={eventContent.content.url}
                    width={eventContent.content.info?.thumbnail_info?.w}
                    height={eventContent.content.info?.thumbnail_info?.h}
                />
            )
        }
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
