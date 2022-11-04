import React from 'react'
import { RoomMessageEvent, TimelineEvent } from 'use-zion-client'
import { RelationType } from 'matrix-js-sdk'
import { ZionTextMessageContent } from 'use-zion-client/dist/types/matrix-types'
import { RichTextPreview } from '@components/RichText/RichTextEditor'
import { getMessageBody } from 'utils/ztevent_util'

type Props = {
    event: TimelineEvent
    eventContent: RoomMessageEvent
}
export const MessageZionText = ({ eventContent, event }: Props) => {
    const { attachments } = eventContent.content as ZionTextMessageContent
    console.log(attachments)
    return (
        <>
            <RichTextPreview
                content={getMessageBody(event.eventId, eventContent)}
                edited={eventContent.content['m.relates_to']?.rel_type === RelationType.Replace}
            />
        </>
    )
}
