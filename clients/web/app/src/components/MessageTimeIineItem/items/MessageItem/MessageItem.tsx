import React, { useCallback, useContext, useMemo, useRef, useState } from 'react'
import {
    MessageType,
    ThreadStats,
    TimelineEvent,
    ZTEvent,
    staticAssertNever,
    useTownsClient,
} from 'use-towns-client'
import { useSearchParams } from 'react-router-dom'
import {
    MessageLayout,
    MessageLayoutProps,
    RedactedMessageLayout,
} from '@components/MessageLayout/MessageLayout'
import { RatioedBackgroundImage } from '@components/RatioedBackgroundImage'
import { useDevice } from 'hooks/useDevice'
import { TooltipRenderer } from '@ui'
import { ProfileHoverCard } from '@components/ProfileHoverCard/ProfileHoverCard'
import { QUERY_PARAMS } from 'routes'
import { SendStatus } from '@components/MessageLayout/SendStatusIndicator'
import {
    MessageAttachments,
    isEmbeddedMessageAttachment,
} from '@components/MessageAttachments/MessageAttachments'
import {
    MessageTimelineContext,
    MessageTimelineType,
    useTimelineContext,
} from '@components/MessageTimeline/MessageTimelineContext'
import {
    EncryptedMessageRenderEvent,
    MessageRenderEvent,
    RedactedMessageRenderEvent,
    RenderEventType,
    isRedactedRoomMessage,
    isRoomMessage,
} from '@components/MessageTimeline/util/getEventsByDate'
import { TimelineEncryptedContent } from '@components/EncryptedContent/EncryptedMessageBody'
import { ReplyToMessageContext } from '@components/ReplyToMessageContext/ReplyToMessageContext'
import { TimelineMessageEditor } from '../MessageEditor'
import { MessageBody } from './MessageBody/MessageBody'
import { QuotedMessage } from './QuotedMessage'

type ItemDataType = MessageRenderEvent | EncryptedMessageRenderEvent | RedactedMessageRenderEvent

type Props = {
    itemData: ItemDataType
    isHighlight?: boolean
}

export const MessageItem = (props: Props) => {
    const { itemData, isHighlight } = props
    const event = itemData.event
    const { client } = useTownsClient()

    const { isTouch } = useDevice()
    const messageTooltipRef = useRef<HTMLElement | null>(null)
    const [hoveredMentionUserId, setHoveredMentionUserId] = useState<string | undefined>(undefined)

    const timelineContext = useContext(MessageTimelineContext)

    const { canReplyInline } = useContext(ReplyToMessageContext)

    const [, setSearchParams] = useSearchParams()

    const onMediaClick = useCallback(
        (e: React.MouseEvent) => {
            if (!event.threadParentId || event.threadParentId.length === 0) {
                setSearchParams((params) => ({
                    ...params,
                    [QUERY_PARAMS.GALLERY_ID]: event.eventId,
                }))
                return
            }
            setSearchParams((params) => ({
                ...params,
                [QUERY_PARAMS.GALLERY_ID]: event.eventId,
                [QUERY_PARAMS.GALLERY_THREAD_ID]: event.threadParentId,
            }))
        },
        [event.threadParentId, event.eventId, setSearchParams],
    )

    const onRetryClick = useCallback(() => {
        if (!event.localEventId || !timelineContext?.channelId || !client) {
            return
        }
        client.retrySendMessage(timelineContext.channelId, event.localEventId)
    }, [client, timelineContext, event.localEventId])

    const attachedLinks = useMemo(() => {
        return (
            (event.content.kind === ZTEvent.RoomMessage &&
                event.content.attachments?.filter(isEmbeddedMessageAttachment).map((a) => a.url)) ||
            []
        )
    }, [event.content])

    if (!timelineContext) {
        return <></>
    }

    const {
        channels,
        members,
        channelId,
        spaceId,
        onMentionClick,
        timelineActions,
        messageRepliesMap,
    } = timelineContext

    const isMessage = itemData.type === RenderEventType.Message
    const isEncryptedMessage = itemData.type === RenderEventType.EncryptedMessage
    const isRedacted = isRedactedRoomMessage(event)

    const displayContext = isMessage || isEncryptedMessage ? itemData.displayContext : 'single'
    const isEditing = event.eventId === timelineActions.editingMessageId
    const isSelectable = !isEncryptedMessage

    const msgTypeKey = getItemContentKey(itemData)

    // replies are only shown for channel messages (two levels only)
    const replies =
        !canReplyInline && timelineContext.type === MessageTimelineType.Channel
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
            selectable={!isEditing && isSelectable}
            displayContext={displayContext}
            replies={replies}
            key={`${event.eventId}${event.updatedAtEpochMs ?? event.createdAtEpochMs}${msgTypeKey}`}
            onMediaClick={onMediaClick}
        >
            {canReplyInline && event.replyParentId && (
                <QuotedMessage eventId={event.replyParentId} />
            )}

            {isEncryptedMessage ? (
                <TimelineEncryptedContent event={event} content={itemData.event.content} />
            ) : event.content.kind === ZTEvent.RoomMessage ? (
                isEditing ? (
                    <>
                        <TimelineMessageEditor
                            initialValue={event.content.body}
                            eventId={event.eventId}
                            eventContent={event.content}
                            channelId={channelId}
                            spaceId={spaceId}
                            attachments={event.content.attachments}
                        />

                        {/* Always show message on touch devices, even while editing also disables onMentionClick. */}
                        {isTouch && (
                            <MessageBody
                                attachedLinks={attachedLinks}
                                eventContent={event.content}
                                event={event}
                                members={members}
                                channels={channels}
                            />
                        )}
                    </>
                ) : event.content.content.msgType === MessageType.Image ? (
                    <RatioedBackgroundImage
                        url={event.content.content.info?.url ?? ''}
                        width={event.content.content.thumbnail?.width}
                        height={event.content.content.thumbnail?.height}
                        onClick={onMediaClick}
                    />
                ) : (
                    <>
                        <MessageBody
                            attachedLinks={attachedLinks}
                            eventContent={event.content}
                            event={event}
                            members={members}
                            channels={channels}
                            onMentionClick={onMentionClick}
                            onMentionHover={(ref, userId) => {
                                messageTooltipRef.current = ref ?? null
                                setHoveredMentionUserId(userId)
                            }}
                            onRetrySend={onRetryClick}
                        />

                        {hoveredMentionUserId && messageTooltipRef.current && !isTouch && (
                            <TooltipRenderer
                                active
                                alignRef={messageTooltipRef}
                                tooltip={<ProfileHoverCard userId={hoveredMentionUserId} />}
                            />
                        )}
                    </>
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
    onMediaClick: (e: React.MouseEvent) => void
}

const MessageWrapper = React.memo((props: MessageWrapperProps) => {
    const { event, displayContext, selectable, replies, onMediaClick } = props
    const { sender } = event
    const timelineContext = useTimelineContext()
    const { isTouch } = useDevice()

    const body = event.content?.kind === ZTEvent.RoomMessage ? event.content.body : undefined

    const {
        membersMap,
        userId,
        channelId,
        spaceId,
        handleReaction,
        type,
        messageReactionsMap,
        isChannelWritable,
        threadParentId,
    } = timelineContext

    const user = membersMap[sender.id]

    const isOwn = event.content?.kind == ZTEvent.RoomMessage && sender.id === userId

    const isRelativeDate = type === MessageTimelineType.Thread

    const reactions = messageReactionsMap[event.eventId]
    const isEditing = event.eventId === timelineContext.timelineActions.editingMessageId

    const sendStatus: undefined | SendStatus = useMemo(
        () =>
            event.localEventId
                ? {
                      isLocalPending: event.isLocalPending,
                      isEncrypting: event.isEncrypting,
                      isFailed: event.isSendFailed,
                  }
                : undefined,
        [event.isEncrypting, event.isLocalPending, event.isSendFailed, event.localEventId],
    )

    const attachments = isRoomMessage(event) ? event.content.attachments : undefined
    const [, setSearchParams] = useSearchParams()
    const onAttachmentClick = useCallback(
        (attachmentId: string) => {
            if (!threadParentId || threadParentId.length === 0) {
                setSearchParams({
                    [QUERY_PARAMS.GALLERY_ID]: attachmentId,
                })
                return
            }
            return setSearchParams({
                [QUERY_PARAMS.GALLERY_ID]: attachmentId,
                [QUERY_PARAMS.GALLERY_THREAD_ID]: threadParentId,
            })
        },
        [setSearchParams, threadParentId],
    )

    return !event ? null : (
        <MessageLayout
            avatarSize="avatar_x4"
            editing={isEditing}
            id={`event-${event.eventId}`}
            highlight={props.highlight}
            selectable={selectable}
            userId={userId}
            senderId={sender.id}
            canReply={!event.isLocalPending && type !== MessageTimelineType.Thread}
            timestamp={event.createdAtEpochMs}
            channelId={channelId}
            editable={isOwn && !event.isLocalPending}
            eventId={event.eventId}
            threadParentId={event.threadParentId}
            displayContext={displayContext}
            isChannelWritable={isChannelWritable}
            user={user}
            paddingTop={displayContext === 'head' || displayContext === 'single' ? 'md' : 'sm'}
            paddingBottom={displayContext === 'tail' || displayContext === 'single' ? 'md' : 'sm'}
            paddingX="md"
            spaceId={spaceId}
            reactions={reactions}
            relativeDate={isRelativeDate}
            replies={replies}
            messageBody={body}
            sendStatus={sendStatus}
            sessionId={event.sessionId}
            onReaction={handleReaction}
        >
            {props.children}

            {attachments && attachments.length > 0 && (
                <MessageAttachments
                    attachments={attachments}
                    onAttachmentClick={onAttachmentClick}
                    onClick={isTouch && selectable ? onMediaClick : undefined}
                />
            )}
        </MessageLayout>
    )
})

function getItemContentKey(itemData: ItemDataType): string {
    switch (itemData.type) {
        case RenderEventType.Message:
            return itemData.event.content.content.msgType ?? ''
        case RenderEventType.EncryptedMessage:
            return itemData.event.content.error === undefined ? 'enc' : 'enc-error'
        case RenderEventType.RedactedMessage:
            return 'redacted'
        default:
            staticAssertNever(itemData)
    }
}
