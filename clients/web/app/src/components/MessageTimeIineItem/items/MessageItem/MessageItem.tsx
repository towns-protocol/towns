import React, { useContext } from 'react'
import { MessageType, ThreadStats, TimelineEvent, ZTEvent } from 'use-zion-client'
import {
    MessageLayout,
    MessageLayoutProps,
    RedactedMessageLayout,
} from '@components/MessageLayout/MessageLayout'
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
    RedactedMessageRenderEvent,
    RenderEventType,
    isRedactedRoomMessage,
} from '../../../MessageTimeline/util/getEventsByDate'
import { TimelineEncryptedContent } from './EncryptedMessageBody/EncryptedMessageBody'
import { MessageBody } from './MessageBody/MessageBody'

type Props = {
    itemData: MessageRenderEvent | EncryptedMessageRenderEvent | RedactedMessageRenderEvent
    isHighlight?: boolean
}

export const MessageItem = (props: Props) => {
    const { itemData, isHighlight } = props
    const event = itemData.event
    const { isTouch } = useDevice()

    const timelineContext = useContext(MessageTimelineContext)

    if (!timelineContext) {
        return <></>
    }

    const { channels, members, channelId, onMentionClick, timelineActions, messageRepliesMap } =
        timelineContext

    const isMessage = itemData.type === RenderEventType.Message
    const isEncryptedMessage = itemData.type === RenderEventType.EncryptedMessage

    const isRedacted = isRedactedRoomMessage(event)

    const displayEncrypted =
        itemData.type === RenderEventType.EncryptedMessage || itemData.displayEncrypted

    const displayContext = isMessage || isEncryptedMessage ? itemData.displayContext : 'single'
    const isEditing = event.eventId === timelineActions.editingMessageId
    const isSelectable = !displayEncrypted

    const msgTypeKey = isMessage ? itemData.event.content.msgType ?? '' : ''

    // replies are only shown for channel messages (two levels only)
    const replies =
        timelineContext.type === MessageTimelineType.Channel
            ? messageRepliesMap?.[event.eventId]
            : undefined

    const isThreadParent = !!messageRepliesMap?.[event.eventId]

    if (isRedacted && (replies || isThreadParent)) {
        // display specific layout for redacted threads
        return <RedactedMessageLayout replies={replies} event={event} />
    } else if (isRedacted) {
        // deleted messages that are not threads are removed before getting here
        // this is merely as safety check + to make TS happy
        return null
    }

    return (
        <MessageWrapper
            highlight={isHighlight}
            event={event}
            selectable={isSelectable}
            displayContext={displayContext}
            replies={replies}
            key={`${event.eventId}${event.updatedServerTs ?? event.originServerTs}${msgTypeKey}`}
        >
            {displayEncrypted ? (
                <TimelineEncryptedContent event={event} displayContext={displayContext} />
            ) : event.content.kind === ZTEvent.RoomMessage ? (
                isEditing ? (
                    <>
                        <TimelineMessageEditor
                            initialValue={event.content.body}
                            eventId={event.eventId}
                            eventContent={event.content}
                            channelId={channelId}
                        />

                        {/* Always show message on touch devices, even while editing also disables onMentionClick. */}
                        {isTouch && (
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
    replies?: ThreadStats
}

const MessageWrapper = React.memo((props: MessageWrapperProps) => {
    const { event, displayContext, selectable, replies } = props
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
        messageReactionsMap,
        isChannelWritable,
    } = timelineContext

    const user = membersMap[sender.id]
    const displayName = getPrettyDisplayName(user).name

    const isOwn = event.content?.kind == ZTEvent.RoomMessage && sender.id === userId

    const isRelativeDate = type === MessageTimelineType.Thread

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
            replies={replies}
            onReaction={handleReaction}
        >
            {props.children}
        </MessageLayout>
    )
})
