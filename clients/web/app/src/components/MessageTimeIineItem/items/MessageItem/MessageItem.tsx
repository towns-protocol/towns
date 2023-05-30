import React, { useContext } from 'react'
import { MessageType, TimelineEvent, ZTEvent } from 'use-zion-client'
import { MessageLayout, MessageLayoutProps } from '@components/MessageLayout/MessageLayout'
import { RatioedBackgroundImage } from '@components/RatioedBackgroundImage'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { useDevice } from 'hooks/useDevice'

import {
    MessageTimelineContext,
    MessageTimelineType,
} from '../../../MessageTimeline/MessageTimelineContext'
import { TimelineMessageEditor } from '../MessageEditor'
import {
    EncryptedMessageRenderEvent,
    MessageRenderEvent,
    RenderEventType,
} from '../../../MessageTimeline/util/getEventsByDate'
import { TimelineEncryptedContent } from './EncryptedMessageBody/EncryptedMessageBody'
import { MessageBody } from './MessageBody/MessageBody'

type Props = {
    itemData: MessageRenderEvent | EncryptedMessageRenderEvent
    isHighlight?: boolean
}

export const MessageItem = (props: Props) => {
    const { itemData, isHighlight } = props
    const event = itemData.event
    const { isMobile } = useDevice()

    const timelineContext = useContext(MessageTimelineContext)

    if (!timelineContext) {
        return <></>
    }

    const { channels, members, channelId, onMentionClick, timelineActions } = timelineContext

    const isMessage = itemData.type === RenderEventType.Message
    const isEncryptedMessage = itemData.type === RenderEventType.EncryptedMessage

    const displayEncrypted =
        itemData.type === RenderEventType.EncryptedMessage || itemData.displayEncrypted

    const displayContext = isMessage || isEncryptedMessage ? itemData.displayContext : 'single'
    const isEditing = event.eventId === timelineActions.editingMessageId
    const isSelectable = !displayEncrypted

    const msgTypeKey = isMessage ? itemData.event.content.msgType ?? '' : ''

    return (
        <MessageWrapper
            highlight={isHighlight}
            event={event}
            selectable={isSelectable}
            displayContext={displayContext}
            key={`${event.eventId}${event.updatedServerTs ?? event.originServerTs}${msgTypeKey}`}
        >
            {displayEncrypted ? (
                <TimelineEncryptedContent event={event} displayContext={displayContext} />
            ) : event.content.kind === ZTEvent.RoomMessage ? (
                isEditing ? (
                    <>
                        <TimelineMessageEditor
                            initialValue={itemData.event.content.body}
                            eventId={event.eventId}
                            eventContent={event.content}
                            channelId={channelId}
                        />

                        {/* Always show message on touch devices, even while editing also disables onMentionClick. */}
                        {isMobile && (
                            <MessageBody
                                eventContent={event.content}
                                event={event}
                                members={members}
                                channels={channels}
                            />
                        )}
                    </>
                ) : event.content.msgType === MessageType.Image ? (
                    event.content.content.info?.url ? (
                        // render v2 image format
                        <RatioedBackgroundImage
                            withLinkOut
                            url={event.content.content.info.url}
                            width={event.content.content.thumbnail?.w}
                            height={event.content.content.thumbnail?.h}
                        />
                    ) : (
                        // render pre-beta image format
                        // see timelineItem.test.tsx for pre-beta format
                        <RatioedBackgroundImage
                            withLinkOut
                            url={event.content.content.url}
                            width={event.content.content.info?.thumbnail_info?.w}
                            height={event.content.content.info?.thumbnail_info?.h}
                        />
                    )
                ) : (
                    <MessageBody
                        eventContent={event.content}
                        event={event}
                        members={members}
                        channels={channels}
                        onMentionClick={onMentionClick}
                    />
                )
            ) : (
                <>not a message</>
            )}
        </MessageWrapper>
    )
}

type MessageWrapperProps = {
    displayContext?: MessageLayoutProps['displayContext']
    event: TimelineEvent
    highlight?: boolean
    selectable?: boolean
    children: React.ReactNode
}

const MessageWrapper = React.memo((props: MessageWrapperProps) => {
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
        isChannelWritable,
    } = timelineContext

    const user = membersMap[sender.id]
    const displayName = getPrettyDisplayName(user).name

    const isOwn = event.content?.kind == ZTEvent.RoomMessage && sender.id === userId

    const isRelativeDate = type === MessageTimelineType.Thread

    // hide replies in threads
    const replyCount =
        timelineContext.type === MessageTimelineType.Channel
            ? messageRepliesMap?.[event.eventId]
            : undefined

    const reactions = messageReactionsMap[event.eventId]
    const isEditing = event.eventId === timelineContext.timelineActions.editingMessageId

    return !event ? null : (
        <MessageLayout
            editing={isEditing}
            id={`event-${event.eventId}`}
            highlight={props.highlight}
            selectable={selectable}
            userId={userId}
            senderId={sender.id}
            canReply={!event.isLocalPending && type !== MessageTimelineType.Thread}
            timestamp={event.originServerTs}
            channelId={channelId}
            editable={isOwn && !event.isLocalPending}
            eventId={event.eventId}
            displayContext={displayContext}
            isChannelWritable={isChannelWritable}
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
        </MessageLayout>
    )
})
