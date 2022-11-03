import { RelationType } from 'matrix-js-sdk'
import React, { useContext } from 'react'

import { MessageType, RoomMessageEvent, TimelineEvent } from 'use-zion-client'
import { Message } from '@components/Message'
import { MessageProps } from '@components/Message/Message'
import { MessageImage } from '@components/MessageImage/MessageImage'
import { RichTextPreview } from '@components/RichText/RichTextEditor'
import { getMessageBody } from 'utils/ztevent_util'
import { MessageTimelineContext, MessageTimelineType } from '../MessageTimelineContext'
import { TimelineMessageEditor } from './TimelineMessageEditor'

type Props = {
    displayContext?: MessageProps['displayContext']
    event: TimelineEvent
    eventContent: RoomMessageEvent
}

export const TimelineMessage = React.memo((props: Props) => {
    const { event, eventContent, displayContext } = props
    const { sender } = eventContent

    const timelineContext = useContext(MessageTimelineContext)

    if (!timelineContext) {
        return <></>
    }

    const {
        membersMap,
        userId,
        channelId,
        spaceId,
        handleReaction,
        type,
        messageRepliesMap,
        messageReactionsMap,
        timelineActions,
    } = timelineContext

    const user = membersMap[sender.id]
    const displayName = user?.name ?? sender.displayName
    const avatarUrl = user?.avatarUrl ?? sender.avatarUrl

    const isOwn = event.content

    const isEditing = event.eventId === timelineActions.editingMessageId
    const isRelativeDate = type === MessageTimelineType.Thread

    // hide replies in threads
    const replyCount =
        timelineContext.type === MessageTimelineType.Channel
            ? messageRepliesMap?.get(event.eventId)
            : undefined

    const reactions = messageReactionsMap.get(event.eventId)

    return !event ? null : (
        <Message
            id={`event-${event.eventId}`}
            userId={userId}
            timestamp={event.originServerTs}
            avatar={avatarUrl}
            channelId={channelId}
            editable={isOwn && !event.isLocalPending}
            eventId={event.eventId}
            displayContext={displayContext}
            name={displayName}
            paddingY={displayContext === 'tail' ? 'sm' : 'md'}
            paddingBottom={displayContext === 'head' ? 'sm' : undefined}
            paddingX="lg"
            spaceId={spaceId}
            reactions={reactions}
            relativeDate={isRelativeDate}
            replies={replyCount}
            onReaction={handleReaction}
        >
            {isEditing ? (
                <TimelineMessageEditor
                    initialValue={eventContent.body}
                    eventId={event.eventId}
                    channelId={channelId}
                />
            ) : eventContent.msgType === MessageType.Image ? (
                <MessageImage content={eventContent.content} />
            ) : (
                <RichTextPreview
                    content={getMessageBody(event.eventId, eventContent)}
                    edited={eventContent.content['m.relates_to']?.rel_type === RelationType.Replace}
                />
            )}
        </Message>
    )
})
