import React from 'react'
import { Channel, MessageType, RoomMember, RoomMessageEvent, TimelineEvent } from 'use-zion-client'
import { RatioedBackgroundImage } from '@components/RatioedBackgroundImage'
import { MessageZionText } from '../../MessageZionText/MessageZionText'

type Props = {
    event: TimelineEvent
    eventContent: RoomMessageEvent
    members: RoomMember[]
    channels: Channel[]
    onMentionClick?: (mentionName: string) => void
}

export const TimelineMessageContent = (props: Props) => {
    const { eventContent, event, members, channels, onMentionClick } = props

    switch (eventContent.msgType) {
        case MessageType.Image: {
            if (eventContent.content.info?.url) {
                // render v2 image format
                return (
                    <RatioedBackgroundImage
                        withLinkOut
                        url={eventContent.content.info.url}
                        width={eventContent.content.thumbnail?.w}
                        height={eventContent.content.thumbnail?.h}
                    />
                )
            } else {
                // render pre-beta image format
                // see timelineItem.test.tsx for pre-beta format
                return (
                    <RatioedBackgroundImage
                        withLinkOut
                        url={eventContent.content.url}
                        width={eventContent.content.info?.thumbnail_info?.w}
                        height={eventContent.content.info?.thumbnail_info?.h}
                    />
                )
            }
        }
        default: {
            return (
                <MessageZionText
                    eventContent={eventContent}
                    event={event}
                    members={members}
                    channels={channels}
                    onMentionClick={onMentionClick}
                />
            )
        }
    }
}
