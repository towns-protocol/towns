import React, { useCallback, useContext, useEffect, useState } from 'react'
import { Sheet } from 'react-modal-sheet'
import { LookupUser, useTownsClient } from 'use-towns-client'
import { useCreateUnreadMarker } from '@components/MessageLayout/hooks/useCreateUnreadMarker'
import { modalSheetClass } from 'ui/styles/globals/sheet.css'
import { Button, Divider, Icon, Stack, useZLayerContext } from '@ui'
import { MessageTimelineContext } from '@components/MessageTimeline/MessageTimelineContext'
import { useOpenMessageThread } from 'hooks/useOpenThread'
import { EmojiPickerContainerMobile } from '@components/EmojiPickerButton/EmojiPickerContainerMobile'
import { TableCell } from '@components/TableCell/TableCell'
import { ReplyToMessageContext } from '@components/ReplyToMessageContext/ReplyToMessageContext'
import { getLinkToMessage } from 'utils/getLinkToMessage'
import useCopyToClipboard from 'hooks/useCopyToClipboard'
import { useRouteParams } from 'hooks/useRouteParams'
import { Analytics, getChannelType } from 'hooks/useAnalytics'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { getThreadReplyOrDmReply, trackPostedMessage } from '@components/Analytics/postedMessage'
import { useGatherSpaceDetailsAnalytics } from '@components/Analytics/useGatherSpaceDetailsAnalytics'
import { env } from 'utils'
import { DeleteMessagePrompt } from './DeleteMessagePrompt'
import { useRedactMessage } from './hooks/useRedactMessage'
import { TipSheet } from './tips/TipSheet'
import { trackTipOnMessage } from './tips/tipAnalytics'

type Props = {
    onClose: () => void
    eventId: string
    channelId?: string
    spaceId?: string
    canEdit?: boolean
    canPin?: boolean
    canReply?: boolean
    canReact?: boolean
    canRedact?: boolean
    messageBody?: string
    threadParentId?: string
    isPinned?: boolean
    messageOwner: LookupUser
}

const emojis: { id: string; native: string }[] = [
    { id: '+1', native: '👍' },
    { id: 'raised_hands', native: '🙌' },
    { id: 'heart', native: '❤️' },
    { id: 'eyes', native: '👀' },
    { id: 'saluting_face', native: '🫡' },
]

export const MessageModalSheet = (props: Props) => {
    const timelineContext = useContext(MessageTimelineContext)
    const mountPoint = useZLayerContext().rootLayerRef?.current ?? undefined
    const {
        onClose,
        eventId,
        spaceId,
        channelId,
        canReply,
        canEdit,
        canPin,
        canReact,
        canRedact,
        isPinned,
        messageBody,
        threadParentId,
        messageOwner,
    } = props
    const [isHidden, setIsHidden] = React.useState(false)
    const { sendReaction, sendReadReceipt, pinMessage, unpinMessage } = useTownsClient()
    const { threadId } = useRouteParams()
    const { openPanel } = usePanelActions()

    const [isOpen, setIsOpen] = useState(false)
    useEffect(() => {
        setIsOpen(true)
    }, [])

    const closeSheet = useCallback(() => {
        setIsOpen(false)
        setTimeout(() => {
            onClose()
        }, 300)
    }, [setIsOpen, onClose])

    const onEditClick = useCallback(() => {
        closeSheet()
        timelineContext?.timelineActions.onSelectEditingMessage(eventId)
    }, [eventId, timelineContext, closeSheet])

    const onTipClick = useCallback(() => {
        setIsHidden(true)
        setActivePrompt('tip')
        trackTipOnMessage('messageActions')
    }, [])

    const onCloseTip = useCallback(
        (args: { closeMessageMenu?: boolean }) => {
            setIsHidden(false)
            setActivePrompt(undefined)
            if (args.closeMessageMenu) {
                closeSheet()
            }
        },
        [closeSheet],
    )

    const { onOpenMessageThread } = useOpenMessageThread(spaceId, channelId)
    const { createUnreadMarker: markAsUnread } = useCreateUnreadMarker({
        eventId,
        channelId,
        threadParentId,
        timeline: timelineContext?.events,
    })
    const { canReplyInline, replyToEventId, setReplyToEventId } = useContext(ReplyToMessageContext)
    const onThreadClick = useCallback(() => {
        onClose()
        if (canReplyInline && setReplyToEventId) {
            setReplyToEventId(eventId)
        } else {
            onOpenMessageThread(eventId)
        }
    }, [canReplyInline, eventId, onClose, onOpenMessageThread, setReplyToEventId])

    const {
        onRedactSelfConfirm,
        onRedactOtherConfirm,
        setDeletePromptToRedactSelf,
        setDeletePromptToRedactOther,
        setDeletePromptToUndefined,
        deletePrompt,
    } = useRedactMessage({
        channelId,
        eventId,
        spaceId,
        threadId,
        canReplyInline,
        replyToEventId: replyToEventId ?? undefined,
    })

    const [activePrompt, setActivePrompt] = useState<'emoji' | 'delete' | 'tip' | undefined>(
        undefined,
    )

    const onCancelEmoji = useCallback(() => {
        setActivePrompt(undefined)
        setIsHidden(false)
    }, [])

    const onEmojiClick = useCallback(() => {
        setActivePrompt('emoji')
        setIsHidden(true)
    }, [])

    const onCopyClick = useCallback(() => {
        navigator.clipboard.writeText(messageBody ?? '')
        closeSheet()
    }, [closeSheet, messageBody])

    const spaceDetailsAnalytics = useGatherSpaceDetailsAnalytics({
        spaceId,
        channelId,
    })

    const sendEmoji = useCallback(
        (id: string) => {
            if (!channelId) {
                console.error('no channel id')
                return
            }
            if (!eventId) {
                console.error('no event id')
                return
            }
            sendReaction(channelId, eventId, id, threadId)
            trackPostedMessage({
                spaceId,
                channelId,

                threadId,
                canReplyInline,
                replyToEventId,
                messageType: 'emoji reaction',
                emojiId: id,
                ...spaceDetailsAnalytics,
            })
            onClose()
        },
        [
            channelId,
            eventId,
            sendReaction,
            threadId,
            spaceId,
            canReplyInline,
            replyToEventId,
            spaceDetailsAnalytics,
            onClose,
        ],
    )

    const onSelectEmoji = useCallback(
        (data: EmojiPickerSelection) => {
            sendEmoji(data.id)
            setActivePrompt(undefined)
        },
        [sendEmoji, setActivePrompt],
    )

    const [, copy] = useCopyToClipboard()

    const onCopyLinkToMessage = useCallback(() => {
        const link = getLinkToMessage({ spaceId, channelId, eventId })
        if (link) {
            copy(`${link}`)
            onClose()
        }
    }, [channelId, copy, eventId, onClose, spaceId])

    const onMarkAsUnreadClick = useCallback(() => {
        const unreadMarker = markAsUnread()
        if (unreadMarker) {
            void sendReadReceipt(unreadMarker, true)
        }
    }, [markAsUnread, sendReadReceipt])

    const onPinMessage = useCallback(() => {
        if (channelId && eventId) {
            const tracked = {
                spaceId,
                channelId,
                channelType: getChannelType(channelId),
                reply: getThreadReplyOrDmReply({ threadId }),
            }
            Analytics.getInstance().track('clicked pin message', tracked)
            pinMessage(channelId, eventId)
            closeSheet()
        }
    }, [channelId, closeSheet, eventId, pinMessage, spaceId, threadId])

    const onVerifySignature = useCallback(() => {
        openPanel(CHANNEL_INFO_PARAMS.VERIFY_EVENT_SIGNATURE, { eventId, streamId: channelId })
    }, [openPanel, eventId, channelId])

    const onUnpinMessage = useCallback(() => {
        if (channelId && eventId) {
            const tracked = {
                spaceId,
                channelId,
                channelType: getChannelType(channelId),
                reply: getThreadReplyOrDmReply({ threadId }),
            }
            Analytics.getInstance().track('clicked unpin message', tracked)
            unpinMessage(channelId, eventId)
            closeSheet()
        }
    }, [channelId, closeSheet, eventId, spaceId, threadId, unpinMessage])

    return (
        <>
            <Sheet
                className={modalSheetClass}
                isOpen={isOpen && !isHidden}
                detent="content-height"
                mountPoint={mountPoint}
                onClose={closeSheet}
            >
                <Sheet.Container>
                    <Sheet.Header />
                    <Sheet.Content>
                        <Sheet.Scroller>
                            <Stack paddingBottom="lg" alignContent="start" gap="sm">
                                {canReact && (
                                    <>
                                        <Stack
                                            horizontal
                                            paddingX="md"
                                            paddingBottom="sm"
                                            justifyContent="spaceBetween"
                                            width="100%"
                                            alignItems="center"
                                        >
                                            {emojis.map((e) => (
                                                <EmojiButton
                                                    key={e.id}
                                                    id={e.id}
                                                    native={e.native}
                                                    onClick={sendEmoji}
                                                />
                                            ))}
                                            <Button
                                                aspectRatio="square"
                                                size="button_rounded_md"
                                                tone="level2"
                                                onClick={onEmojiClick}
                                            >
                                                <Icon type="emojiAdd" onClick={onEmojiClick} />
                                            </Button>
                                        </Stack>
                                        <Divider />
                                    </>
                                )}
                                <Stack paddingX="sm" gap="sm">
                                    {canReact && (
                                        <TableCell
                                            iconType="emojiAdd"
                                            text="Add Reaction"
                                            onClick={onEmojiClick}
                                        />
                                    )}
                                    {canReply && (
                                        <TableCell
                                            iconType="reply"
                                            text={
                                                canReplyInline ? 'Direct Reply' : 'Reply in Thread'
                                            }
                                            onClick={onThreadClick}
                                        />
                                    )}

                                    {env.VITE_TIPS_ENABLED && !props.canEdit && (
                                        <TableCell
                                            iconType="dollar"
                                            iconColor="cta1"
                                            text="Tip Message"
                                            onClick={onTipClick}
                                        />
                                    )}
                                    <TableCell
                                        iconType="messageUnread"
                                        text="Mark as Unread"
                                        onClick={onMarkAsUnreadClick}
                                    />
                                    <TableCell
                                        iconType="link"
                                        text="Copy Link"
                                        onClick={onCopyLinkToMessage}
                                    />
                                    {messageBody && (
                                        <TableCell
                                            iconType="copy"
                                            text="Copy Text"
                                            onClick={onCopyClick}
                                        />
                                    )}
                                    {canEdit && (
                                        <TableCell
                                            iconType="edit"
                                            text="Edit Message"
                                            onClick={onEditClick}
                                        />
                                    )}
                                    {(canEdit || (canRedact && spaceId)) && (
                                        <TableCell
                                            isError
                                            iconType="delete"
                                            text="Delete Message"
                                            onClick={() => {
                                                setIsHidden(true)
                                                if (canEdit) {
                                                    setDeletePromptToRedactSelf()
                                                } else {
                                                    setDeletePromptToRedactOther()
                                                }
                                            }}
                                        />
                                    )}

                                    {canPin ? (
                                        isPinned ? (
                                            <TableCell
                                                iconType="unpin"
                                                text="Unpin message"
                                                onClick={onUnpinMessage}
                                            />
                                        ) : (
                                            <TableCell
                                                iconType="pin"
                                                text="Pin Message"
                                                onClick={onPinMessage}
                                            />
                                        )
                                    ) : null}

                                    <TableCell
                                        iconType="verified"
                                        text="Verify Event Signature"
                                        onClick={onVerifySignature}
                                    />
                                </Stack>
                            </Stack>
                        </Sheet.Scroller>
                    </Sheet.Content>
                </Sheet.Container>
                <Sheet.Backdrop onTap={closeSheet} />
            </Sheet>

            {deletePrompt && (
                <DeleteMessagePrompt
                    onDeleteCancel={() => {
                        setIsHidden(false)
                        setDeletePromptToUndefined()
                    }}
                    onDeleteConfirm={async () => {
                        if (deletePrompt === 'redactOther') {
                            await onRedactOtherConfirm()
                        } else {
                            onRedactSelfConfirm()
                        }
                    }}
                />
            )}

            {activePrompt == 'emoji' && (
                <EmojiPickerContainerMobile
                    onEmojiSelect={onSelectEmoji}
                    onCancel={onCancelEmoji}
                />
            )}

            {activePrompt == 'tip' && (
                <TipSheet messageOwner={messageOwner} eventId={eventId} onCloseTip={onCloseTip} />
            )}
        </>
    )
}

const EmojiButton = (props: { id: string; native: string; onClick: (id: string) => void }) => {
    return (
        <Button
            aspectRatio="square"
            size="button_rounded_md"
            tone="level2"
            onClick={() => props.onClick(props.id)}
        >
            {props.native}
        </Button>
    )
}
