import React from 'react'
import { Channel, RoomMember, RoomMessageEvent, TimelineEvent } from 'use-zion-client'
import { RelationType } from 'matrix-js-sdk'
import { RichTextPreview } from '@components/RichText/RichTextEditor'
import { getMessageBody } from 'utils/ztevent_util'

type Props = {
    event: TimelineEvent
    eventContent: RoomMessageEvent
    members: RoomMember[]
    channels: Channel[]
}
export const MessageZionText = ({ eventContent, event, members, channels }: Props) => {
    return (
        <RichTextPreview
            content={getMessageBody(event.eventId, eventContent)}
            edited={eventContent.content['m.relates_to']?.rel_type === RelationType.Replace}
            members={members}
            channels={channels}
        />
    )
}
