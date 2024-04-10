import React, { useCallback, useContext, useRef } from 'react'
import {
    Permission,
    TimelineEvent,
    useConnectivity,
    useFullyReadMarker,
    useHasPermission,
    useMyUserId,
    useTownsClient,
} from 'use-towns-client'
import { EmojiPickerButton } from '@components/EmojiPickerButton'
import { Box, IconButton, MotionStack, Stack } from '@ui'
import { useOpenMessageThread } from 'hooks/useOpenThread'
import { vars } from 'ui/styles/vars.css'
import { MessageTimelineContext } from '@components/MessageTimeline/MessageTimelineContext'
import { useShortcut } from 'hooks/useShortcut'
import { ShortcutTooltip } from '@components/Shortcuts/ShortcutTooltip'
import useCopyToClipboard from 'hooks/useCopyToClipboard'
import { ReplyToMessageContext } from '@components/ReplyToMessageContext/ReplyToMessageContext'
import { getLinkToMessage } from 'utils/getLinkToMessage'
import { DeleteMessagePrompt } from './DeleteMessagePrompt'

type Props = {
    eventId: string
    channelId?: string
    threadParentId?: string
    spaceId?: string
    canEdit?: boolean
    canReply?: boolean
    canReact?: boolean
}

const style = {
    transform: `
    translateY(calc(-100% + 0.5 * ${vars.space.md}))
  `,
}

export const MessageContextMenu = (props: Props) => {
    const { eventId, channelId, spaceId, threadParentId } = props

    const { redactEvent, sendReaction, sendReadReceipt, adminRedactMessage } = useTownsClient()
    const timelineContext = useContext(MessageTimelineContext)

    const { canReplyInline, setReplyToEventId } = useContext(ReplyToMessageContext)
    const { onOpenMessageThread } = useOpenMessageThread(spaceId, channelId)

    const [copiedText, copy] = useCopyToClipboard()
    const hasCopied = !!copiedText
    const { loggedInWalletAddress } = useConnectivity()

    const { hasPermission: canRedact } = useHasPermission({
        spaceId: spaceId ?? '',
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.Redact,
    })

    const onSelectEmoji = useCallback(
        (data: { id: string }) => {
            if (!channelId) {
                console.error('no channel id')
                return
            }
            if (!data.id) {
                console.error('no emoji id')
                return
            }
            sendReaction(channelId, eventId, data.id)
        },
        [channelId, eventId, sendReaction],
    )
    const ref = useRef<HTMLDivElement>(null)

    const [deletePrompt, setDeletePrompt] = React.useState<
        'adminRedaction' | 'redaction' | undefined
    >(undefined)

    const onDeleteClick = useCallback(() => {
        if (channelId && eventId) {
            setDeletePrompt('redaction')
        }
    }, [channelId, eventId])

    const onDeleteCancel = useCallback(() => {
        setDeletePrompt(undefined)
    }, [])

    const timeline = timelineContext?.events

    const { createUnreadMarker: markAsUnread } = useCreateUnreadMarker({
        eventId,
        channelId,
        threadParentId,
        timeline,
    })

    const onEditClick = useShortcut(
        'EditMessage',
        useCallback(() => {
            if (props.canEdit) {
                timelineContext?.timelineActions?.onSelectEditingMessage(eventId)
            }
        }, [eventId, props.canEdit, timelineContext?.timelineActions]),
        { enableOnContentEditable: false },
        [],
    )
    const onReply = useShortcut(
        'ReplyToMessage',
        useCallback(() => {
            if (props.canReply) {
                if (canReplyInline && setReplyToEventId) {
                    setReplyToEventId(eventId)
                } else {
                    onOpenMessageThread(eventId)
                }
            }
        }, [canReplyInline, eventId, onOpenMessageThread, setReplyToEventId, props.canReply]),
        { enableOnContentEditable: false },
        [],
    )

    const onRedactConfirm = useShortcut(
        'DeleteMessage',
        useCallback(() => {
            if (channelId) {
                redactEvent(channelId, eventId)
            }
        }, [channelId, eventId, redactEvent]),
        { enableOnContentEditable: false },
        [],
    )

    const onAdminRedactConfirm = useCallback(() => {
        if (channelId && eventId) {
            adminRedactMessage(channelId, eventId)
        }
    }, [channelId, eventId, adminRedactMessage])

    const onCopyLinkToMessage = useShortcut(
        'CopyLinkToMessage',
        useCallback(() => {
            const link = getLinkToMessage({ spaceId, channelId, eventId: eventId })
            if (link) {
                copy(link)
            }
        }, [channelId, copy, eventId, spaceId]),
        { enableOnContentEditable: false },
        [],
    )

    const onMarkAsUnreadClick = useShortcut(
        'MarkAsUnread',
        useCallback(() => {
            const unreadMarker = markAsUnread()
            if (unreadMarker) {
                void sendReadReceipt(unreadMarker, true)
            }
        }, [markAsUnread, sendReadReceipt]),
        { enableOnContentEditable: false },
        [],
    )

    const onAdminRedact = useCallback(() => {
        setDeletePrompt('adminRedaction')
    }, [setDeletePrompt])

    return (
        <MotionStack pointerEvents="auto" position="topRight" {...animation} ref={ref}>
            {/* extra space for hover */}
            <Box padding style={style} zIndex="ui">
                <Stack
                    border
                    horizontal
                    hoverable
                    inset="xs"
                    background="level1"
                    color="gray2"
                    gap="xs"
                    padding="xs"
                    rounded="sm"
                    width="auto"
                    alignContent="center"
                    alignItems="center"
                >
                    {props.canEdit && (
                        <IconButton
                            icon="edit"
                            size="square_sm"
                            tooltip={<ShortcutTooltip action="EditMessage" />}
                            onClick={onEditClick}
                        />
                    )}

                    {props.canReply && (
                        <IconButton
                            icon={canReplyInline ? 'reply' : 'threads'}
                            size="square_sm"
                            tooltip={<ShortcutTooltip action="ReplyToMessage" />}
                            onClick={onReply}
                        />
                    )}
                    {props.canReact && (
                        <EmojiPickerButton
                            parentFocused
                            tooltip={<ShortcutTooltip action="ReactToMessage" />}
                            shortcut="ReactToMessage"
                            onSelectEmoji={onSelectEmoji}
                        />
                    )}
                    <IconButton
                        tooltip={<ShortcutTooltip action="MarkAsUnread" />}
                        icon="messageUnread"
                        size="square_sm"
                        onClick={onMarkAsUnreadClick}
                    />
                    <IconButton
                        color={hasCopied ? 'positive' : 'gray2'}
                        tooltip={
                            hasCopied ? 'Copied!' : <ShortcutTooltip action="CopyLinkToMessage" />
                        }
                        icon="link"
                        size="square_sm"
                        onClick={onCopyLinkToMessage}
                    />
                    {props.canEdit ? (
                        <IconButton
                            tooltip={<ShortcutTooltip action="DeleteMessage" />}
                            icon="delete"
                            size="square_sm"
                            color="error"
                            onClick={onDeleteClick}
                        />
                    ) : canRedact && spaceId ? (
                        <IconButton
                            icon="delete"
                            size="square_sm"
                            color="gray2"
                            onClick={onAdminRedact}
                        />
                    ) : (
                        <></>
                    )}
                </Stack>
            </Box>
            {deletePrompt && (
                <DeleteMessagePrompt
                    onDeleteCancel={onDeleteCancel}
                    onDeleteConfirm={
                        deletePrompt === 'adminRedaction' ? onAdminRedactConfirm : onRedactConfirm
                    }
                />
            )}
        </MotionStack>
    )
}

const animation = {
    initial: 'hide',
    animate: 'show',
    exit: 'hide',

    variants: {
        hide: {
            y: 10,
            opacity: 0,
            transition: {
                delay: 0,
                duration: 0.25,
            },
        },
        show: {
            y: 0,
            opacity: 1,
            transition: {
                delay: 0.1,
                duration: 0.15,
            },
        },
    },
} as const

const useCreateUnreadMarker = (params: {
    eventId: string
    channelId?: string
    threadParentId: string | undefined
    timeline?: TimelineEvent[]
}) => {
    const { eventId, channelId, threadParentId, timeline } = params
    const myUserId = useMyUserId()
    const marker = useFullyReadMarker(channelId, threadParentId)

    const createUnreadMarker = useCallback(() => {
        const eventIndex = timeline?.findIndex((e) => e.eventId === eventId)
        if (eventIndex && eventIndex >= 0 && marker && timeline) {
            const mentions = timeline
                .slice(eventIndex)
                .filter(
                    (e) =>
                        e.isMentioned &&
                        e.threadParentId === threadParentId &&
                        e.sender.id !== myUserId,
                ).length
            return {
                ...marker,
                threadParentId,
                eventId,
                eventNum: BigInt(timeline[eventIndex].eventNum),
                mentions,
            }
        }
        return undefined
    }, [eventId, marker, myUserId, threadParentId, timeline])

    return {
        createUnreadMarker,
    }
}
