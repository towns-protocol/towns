import React, { useCallback, useContext, useMemo, useRef, useState } from 'react'
import { ThreadStatsData, staticAssertNever, useTownsClient, useUserLookup } from 'use-towns-client'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { MessageType, Pin, RiverTimelineEvent, TimelineEvent } from '@towns-protocol/sdk'
import { bin_toString } from '@towns-protocol/dlog'
import {
    MessageLayout,
    MessageLayoutProps,
    RedactedMessageLayout,
} from '@components/MessageLayout/MessageLayout'
import { RatioedBackgroundImage } from '@components/RatioedBackgroundImage'
import { useDevice } from 'hooks/useDevice'
import { Box, TooltipRenderer } from '@ui'
import { ProfileHoverCard } from '@components/ProfileHoverCard/ProfileHoverCard'
import { QUERY_PARAMS } from 'routes'
import { SendStatus } from '@components/MessageLayout/SendStatusIndicator'
import {
    MessageAttachments,
    isUrlAttachement,
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
    TokenTransferRenderEvent,
    isChannelMessage,
    isRedactedChannelMessage,
} from '@components/MessageTimeline/util/getEventsByDate'
import { TimelineEncryptedContent } from '@components/EncryptedContent/EncryptedMessageBody'
import { ReplyToMessageContext } from '@components/ReplyToMessageContext/ReplyToMessageContext'
import { useUploadStore } from '@components/MediaDropContext/uploadStore'
import { PastedFile } from '@components/RichTextPlate/components/PasteFilePlugin'
import { FileUpload } from '@components/MediaDropContext/mediaDropTypes'
import { TimelineMessageEditor } from '../MessageEditor'
import { MessageBody } from './MessageBody/MessageBody'
import { QuotedMessage } from './QuotedMessage'
import { TokenTransfer } from '../TokenTransfer'
import { MessageEditContextProvider } from '../MessageEditContext'

type ItemDataType =
    | MessageRenderEvent
    | EncryptedMessageRenderEvent
    | RedactedMessageRenderEvent
    | TokenTransferRenderEvent

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

    const messageUploads = useUploadStore((state) =>
        event.localEventId ? state.uploads[event.localEventId]?.uploads : undefined,
    )

    const attachedLinks = useMemo(() => {
        return (
            (event.content.kind === RiverTimelineEvent.ChannelMessage &&
                event.content.attachments?.filter(isUrlAttachement).map((a) => a.url)) ||
            []
        )
    }, [event.content])

    if (!timelineContext) {
        return <></>
    }

    const { channels, channelId, spaceId, onMentionClick, timelineActions, messageRepliesMap } =
        timelineContext

    const isMessage = itemData.type === RenderEventType.Message
    const isTokenTransfer = itemData.type === RenderEventType.TokenTransfer
    const isEncryptedMessage = itemData.type === RenderEventType.EncryptedMessage

    const isRedacted = isRedactedChannelMessage(event)

    const displayContext =
        isMessage || isEncryptedMessage || isTokenTransfer ? itemData.displayContext : 'single'
    const isEditing = event.eventId === timelineActions.editingMessageId

    const pin = timelineContext.pins?.find((p) => p.event.hashStr === event.eventId)

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
            pin={pin}
            highlight={isHighlight}
            event={event}
            selectable={!isEditing && !isEncryptedMessage}
            isEncryptedMessage={isEncryptedMessage}
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
            ) : event.content.kind === RiverTimelineEvent.ChannelMessage ? (
                isEditing ? (
                    <>
                        <TimelineMessageEditor
                            initialValue={event.content.body}
                            eventId={event.eventId}
                            latestEventId={event.latestEventId}
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

                        {!!messageUploads?.length && <MessageUploads uploads={messageUploads} />}
                    </>
                )
            ) : event.content.kind === RiverTimelineEvent.TokenTransfer ? (
                <TokenTransfer event={event.content} />
            ) : (
                <>not a message</>
            )}
        </MessageWrapper>
    )
}

const MessageUploads = (props: { uploads: FileUpload[] }) => {
    const { uploads } = props

    return (
        <Box gap horizontal>
            <AnimatePresence>
                {uploads.map((u) => (
                    <PastedFile
                        sending={u.progress < 1}
                        id={u.id}
                        key={u.id}
                        content={u.content}
                        progress={u.progress}
                        failed={u.failed}
                        waitingToSend={false}
                    />
                ))}
            </AnimatePresence>
        </Box>
    )
}

type MessageWrapperProps = {
    displayContext?: MessageLayoutProps['displayContext']
    event: TimelineEvent
    highlight?: boolean
    selectable?: boolean
    isEncryptedMessage?: boolean
    children: React.ReactNode
    replies?: ThreadStatsData
    onMediaClick: (e: React.MouseEvent) => void
    pin?: Pin
}

const MessageWrapper = React.memo((props: MessageWrapperProps) => {
    const { event, displayContext, selectable, replies, onMediaClick, isEncryptedMessage } = props
    const { sender } = event
    const timelineContext = useTimelineContext()
    const { isTouch } = useDevice()
    const user = useUserLookup(sender.id)

    const body =
        event.content?.kind === RiverTimelineEvent.ChannelMessage ? event.content.body : undefined

    const {
        channelId,
        handleReaction,
        isChannelWritable,
        isChannelPinnable,
        isChannelReactable,
        messageReactionsMap,
        pins,
        spaceId,
        threadParentId,
        type,
        userId,
        channelTips,
    } = timelineContext

    const isOwn = event.content?.kind == RiverTimelineEvent.ChannelMessage && sender.id === userId

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

    const attachments = isChannelMessage(event) ? event.content.attachments : undefined
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

    const pin = pins?.find(
        (p) => p.event.hashStr === event.eventId || p.event.hashStr === event.latestEventId,
    )

    const messageLayout = !event ? null : (
        <MessageLayout
            avatarSize="avatar_x4"
            editing={isEditing}
            id={`event-${event.localEventId ?? event.eventId}`}
            highlight={props.highlight}
            selectable={selectable}
            isEncryptedMessage={isEncryptedMessage}
            userId={userId}
            senderId={sender.id}
            canPin={!event.isLocalPending && isChannelPinnable}
            canReply={
                isChannelWritable && !event.isLocalPending && type !== MessageTimelineType.Thread
            }
            timestamp={event.createdAtEpochMs}
            channelId={channelId}
            editable={isOwn && !event.isLocalPending}
            eventId={event.eventId}
            latestEventId={event.latestEventId}
            threadParentId={event.threadParentId}
            displayContext={displayContext}
            isChannelWritable={isChannelWritable}
            isChannelReactable={isChannelReactable}
            user={user}
            paddingTop={displayContext === 'head' || displayContext === 'single' ? 'md' : 'sm'}
            paddingBottom={
                displayContext === 'tail' || displayContext === 'single'
                    ? 'md'
                    : event.content?.kind === RiverTimelineEvent.TokenTransfer
                    ? '2'
                    : 'sm'
            }
            paddingX="md"
            spaceId={spaceId}
            reactions={reactions}
            tips={channelTips[event.eventId]}
            relativeDate={isRelativeDate}
            replies={replies}
            messageBody={body}
            sendStatus={sendStatus}
            sessionId={event.sessionId}
            pin={pin}
            onReaction={handleReaction}
        >
            {props.children}

            {attachments && attachments.length > 0 && (
                <MessageAttachments
                    eventId={event.eventId}
                    attachments={attachments}
                    threadParentId={threadParentId}
                    onAttachmentClick={onAttachmentClick}
                    onClick={isTouch && selectable ? onMediaClick : undefined}
                />
            )}
        </MessageLayout>
    )

    if (isEditing) {
        return <MessageEditContextProvider>{messageLayout}</MessageEditContextProvider>
    } else {
        return messageLayout
    }
})

function getItemContentKey(itemData: ItemDataType): string {
    switch (itemData.type) {
        case RenderEventType.Message:
            return itemData.event.content.content.msgType ?? ''
        case RenderEventType.EncryptedMessage:
            return itemData.event.content.error === undefined ? 'enc' : 'enc-error'
        case RenderEventType.RedactedMessage:
            return 'redacted'
        case RenderEventType.TokenTransfer: {
            const transaction = itemData?.event.content.transaction
            if (!transaction) {
                return ''
            }
            return transaction.receipt?.transactionHash
                ? bin_toString(transaction.receipt.transactionHash)
                : transaction.solanaReceipt?.transaction?.signatures[0] ?? ''
        }
        default:
            staticAssertNever(itemData)
    }
}
