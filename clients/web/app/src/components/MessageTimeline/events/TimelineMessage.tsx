import React, { useContext } from 'react'

import { TimelineEvent, ZTEvent } from 'use-zion-client'
import { Message } from '@components/Message'
import { MessageProps } from '@components/Message/Message'
import { MessageTimelineContext, MessageTimelineType } from '../MessageTimelineContext'

type Props = {
    displayContext?: MessageProps['displayContext']
    event: TimelineEvent
    highlight?: boolean
    selectable?: boolean
    children: React.ReactNode
}

export const TimelineMessage = React.memo((props: Props) => {
    const { event, displayContext, selectable } = props
    const { sender } = event

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
    } = timelineContext

    const user = membersMap[sender.id]
    const displayName = user?.name ?? sender.displayName
    const avatarUrl = user?.avatarUrl ?? sender.avatarUrl

    const isOwn = event.content?.kind == ZTEvent.RoomMessage && sender.id === userId

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
            selectable={selectable}
            userId={userId}
            senderId={sender.id}
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
            {props.children}
        </Message>
    )
})
