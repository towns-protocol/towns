import React, { useContext } from 'react'

import { RoomMessageEvent, TimelineEvent, ZTEvent } from 'use-zion-client'
import { Message } from '@components/Message'
import { MessageProps } from '@components/Message/Message'
import { MessageTimelineContext, MessageTimelineType } from '../MessageTimelineContext'
import { TimelineMessageEditor } from './TimelineMessageEditor'
import { TimelineMessageContent } from './TimelineMessagesContent'

type Props = {
    displayContext?: MessageProps['displayContext']
    event: TimelineEvent
    eventContent: RoomMessageEvent
    highlight?: boolean
}

export const TimelineMessage = React.memo((props: Props) => {
    const { event, eventContent, displayContext } = props
    const { sender } = eventContent

    const timelineContext = useContext(MessageTimelineContext)

    if (!timelineContext) {
        return <></>
    }

    const {
        channels,
        membersMap,
        members,
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

    const isOwn = event.content?.kind == ZTEvent.RoomMessage && event.content.sender.id === userId

    const isEditing = event.eventId === timelineActions.editingMessageId
    const isRelativeDate = type === MessageTimelineType.Thread

    // hide replies in threads
    const replyCount =
        timelineContext.type === MessageTimelineType.Channel
            ? messageRepliesMap?.[event.eventId]
            : undefined

    const reactions = messageReactionsMap[event.eventId]

    return !event ? null : (
        <Message
            id={`event-${event.eventId}`}
            highlight={props.highlight}
            userId={userId}
            canReply={!event.isLocalPending && type !== MessageTimelineType.Thread}
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
            ) : (
                <TimelineMessageContent
                    event={event}
                    eventContent={eventContent}
                    members={members}
                    channels={channels}
                />
            )}
        </Message>
    )
})
