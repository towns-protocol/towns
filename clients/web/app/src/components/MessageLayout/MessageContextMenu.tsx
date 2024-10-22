import React, { useCallback, useContext, useMemo, useRef } from 'react'
import { Permission, useConnectivity, useHasPermission, useTownsClient } from 'use-towns-client'
import { EmojiPickerButton } from '@components/EmojiPickerButton'
import { Box, BoxProps, IconButton, IconName, MotionStack, Paragraph, Stack } from '@ui'
import { useOpenMessageThread } from 'hooks/useOpenThread'
import { vars } from 'ui/styles/vars.css'
import { MessageTimelineContext } from '@components/MessageTimeline/MessageTimelineContext'
import { useShortcut } from 'hooks/useShortcut'
import { ShortcutTooltip } from '@components/Shortcuts/ShortcutTooltip'
import useCopyToClipboard from 'hooks/useCopyToClipboard'
import { ReplyToMessageContext } from '@components/ReplyToMessageContext/ReplyToMessageContext'
import { getLinkToMessage } from 'utils/getLinkToMessage'
import { Analytics, getChannelType, getThreadReplyOrDmReply } from 'hooks/useAnalytics'
import { useRouteParams } from 'hooks/useRouteParams'
import { ShortcutAction, ShortcutActions } from 'data/shortcuts'
import { ShortcutKeys } from '@components/Shortcuts/ShortcutKeys'
import { TooltipContext } from 'ui/components/Tooltip/TooltipRenderer'
import { isInputFocused } from '@components/RichTextPlate/utils/helpers'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { useCreateUnreadMarker } from './hooks/useCreateUnreadMarker'
import { DeleteMessagePrompt } from './DeleteMessagePrompt'

type Props = {
    eventId: string
    latestEventId?: string
    channelId?: string
    threadParentId?: string
    spaceId?: string
    canEdit?: boolean
    canPin?: boolean
    canReply?: boolean
    canReact?: boolean
    isFocused?: boolean
    isPinned?: boolean
}

const style = {
    transform: `
    translateY(calc(-100% + 0.5 * ${vars.space.md}))
  `,
}

export const MessageContextMenu = (props: Props) => {
    const { eventId, latestEventId, channelId, spaceId, threadParentId, isFocused, isPinned } =
        props

    const {
        redactEvent,
        sendReaction,
        sendReadReceipt,
        adminRedactMessage,
        pinMessage,
        unpinMessage,
    } = useTownsClient()
    const timelineContext = useContext(MessageTimelineContext)

    const { canReplyInline, replyToEventId, setReplyToEventId } = useContext(ReplyToMessageContext)
    const { onOpenMessageThread } = useOpenMessageThread(spaceId, channelId)

    const [copiedText, copy] = useCopyToClipboard()
    const hasCopied = !!copiedText
    const { loggedInWalletAddress } = useConnectivity()
    const { threadId } = useRouteParams()
    const { openPanel } = usePanelActions()

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
            sendReaction(channelId, eventId, data.id, threadId)
            Analytics.getInstance().track('posted message', {
                spaceId,
                channelId,
                channelType: getChannelType(channelId),
                reply: getThreadReplyOrDmReply({
                    threadId,
                    canReplyInline,
                    replyToEventId,
                }),
                messageType: 'emoji reaction',
                emojiId: data.id,
            })
        },
        [canReplyInline, channelId, eventId, replyToEventId, sendReaction, spaceId, threadId],
    )
    const ref = useRef<HTMLDivElement>(null)

    const [deletePrompt, setDeletePrompt] = React.useState<
        'adminRedaction' | 'redaction' | undefined
    >(undefined)

    const onDeleteClick = useShortcut(
        'DeleteMessage',
        useCallback(() => {
            if (channelId && eventId) {
                setDeletePrompt('redaction')
            }
        }, [channelId, eventId, setDeletePrompt]),
        { enableOnContentEditable: false, enabled: !isInputFocused() },
        [],
    )

    const onVerifySignature = useCallback(() => {
        openPanel(CHANNEL_INFO_PARAMS.VERIFY_EVENT_SIGNATURE, { eventId, streamId: channelId })
    }, [openPanel, eventId, channelId])

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
        { enableOnContentEditable: false, enabled: !isInputFocused() },
        [],
    )
    const onReply = useShortcut(
        'ReplyInThread',
        useCallback(() => {
            if (props.canReply) {
                if (canReplyInline && setReplyToEventId) {
                    setReplyToEventId(eventId)
                } else {
                    onOpenMessageThread(eventId)
                }
            }
        }, [canReplyInline, eventId, onOpenMessageThread, setReplyToEventId, props.canReply]),
        { enableOnContentEditable: false, enabled: !isInputFocused() },
        [],
    )

    const onRedactConfirm = useCallback(() => {
        if (channelId) {
            redactEvent(channelId, eventId)
            Analytics.getInstance().track('posted message', {
                channelId,
                channelType: getChannelType(channelId),
                messageType: 'redacted',
                reply: getThreadReplyOrDmReply({
                    threadId,
                    canReplyInline,
                    replyToEventId,
                }),
            })
        }
    }, [canReplyInline, channelId, eventId, redactEvent, replyToEventId, threadId])

    const onAdminRedactConfirm = useCallback(() => {
        if (channelId && eventId) {
            adminRedactMessage(channelId, eventId)
            Analytics.getInstance().track('posted message', {
                channelId,
                channelType: getChannelType(channelId),
                messageType: 'admin redacted',
                reply: getThreadReplyOrDmReply({ threadId, canReplyInline, replyToEventId }),
            })
        }
    }, [channelId, eventId, adminRedactMessage, threadId, canReplyInline, replyToEventId])

    const onCopyLinkToMessage = useShortcut(
        'CopyLinkToMessage',
        useCallback(() => {
            const link = getLinkToMessage({ spaceId, channelId, eventId, threadId: threadParentId })
            if (link) {
                copy(link)
            }
        }, [channelId, copy, eventId, spaceId, threadParentId]),
        { enableOnContentEditable: false, enabled: !isInputFocused() },
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
        { enableOnContentEditable: false, enabled: !isInputFocused() },
        [],
    )

    const onAdminRedact = useCallback(() => {
        setDeletePrompt('adminRedaction')
    }, [setDeletePrompt])

    const onPinMessage = useCallback(() => {
        const e = latestEventId ?? eventId
        if (channelId && e) {
            const tracked = {
                spaceId,
                channelId,
                channelType: getChannelType(channelId),
                reply: getThreadReplyOrDmReply({ threadId }),
            }
            Analytics.getInstance().track('clicked pin message', tracked)
            pinMessage(channelId, e)
        }
    }, [channelId, eventId, latestEventId, pinMessage, spaceId, threadId])

    const onUnpinMessage = useCallback(() => {
        const e = latestEventId ?? eventId
        if (channelId && e) {
            const tracked = {
                spaceId,
                channelId,
                channelType: getChannelType(channelId),
                reply: getThreadReplyOrDmReply({ threadId }),
            }
            Analytics.getInstance().track('clicked unpin message', tracked)
            unpinMessage(channelId, e)
        }
    }, [channelId, eventId, latestEventId, spaceId, threadId, unpinMessage])

    const submenuItems = useMemo(() => {
        const submenuItems = []

        if (props.canEdit) {
            submenuItems.push({
                key: 'edit',
                disabled: !props.canEdit,
                icon: 'edit',
                text: 'Edit message',
                shortcutAction: 'EditMessage' as const,
                onClick: onEditClick,
            } as const)
        }

        submenuItems.push({
            key: 'markAsUnread',
            icon: 'messageUnread',
            text: 'Mark unread',
            shortcutAction: 'MarkAsUnread' as const,
            onClick: onMarkAsUnreadClick,
        } as const)

        if (props.canPin) {
            submenuItems.push(
                isPinned
                    ? ({
                          key: 'unpin',
                          icon: 'unpin',
                          text: 'Unpin message',
                          onClick: onUnpinMessage,
                      } as const)
                    : ({
                          key: 'pin',
                          icon: 'pin',
                          text: 'Pin message',
                          onClick: onPinMessage,
                      } as const),
            )
        }

        if (props.canEdit || (canRedact && spaceId)) {
            submenuItems.push({
                key: 'delete',
                icon: 'delete',
                text: 'Delete message',
                color: 'error',
                shortcutAction: 'DeleteMessage' as const,
                onClick: props.canEdit ? onDeleteClick : onAdminRedact,
            } as const)
        }

        submenuItems.push({
            key: 'verifySignature',
            icon: 'verifySignature',
            text: 'Verify Event Signature',
            onClick: onVerifySignature,
        } as const)

        return submenuItems
    }, [
        canRedact,
        isPinned,
        onAdminRedact,
        onDeleteClick,
        onEditClick,
        onMarkAsUnreadClick,
        onPinMessage,
        onUnpinMessage,
        onVerifySignature,
        props.canEdit,
        props.canPin,
        spaceId,
    ])

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
                    {props.canReact && (
                        <EmojiPickerButton
                            parentFocused={isFocused}
                            tooltip={<ShortcutTooltip action="ReactToMessage" />}
                            shortcut="ReactToMessage"
                            onSelectEmoji={onSelectEmoji}
                        />
                    )}

                    {props.canReply && (
                        <IconButton
                            icon="reply"
                            size="square_sm"
                            tooltip={
                                canReplyInline ? (
                                    <ShortcutTooltip action="DirectReply" />
                                ) : (
                                    <ShortcutTooltip action="ReplyInThread" />
                                )
                            }
                            data-testid="message-reply--button"
                            onClick={onReply}
                        />
                    )}

                    <IconButton
                        color={hasCopied ? 'positive' : 'gray2'}
                        tooltip={
                            hasCopied ? 'Copied!' : <ShortcutTooltip action="CopyLinkToMessage" />
                        }
                        icon="link"
                        size="square_sm"
                        data-testid="message-link-copy-button"
                        onClick={onCopyLinkToMessage}
                    />

                    {submenuItems.length > 0 && (
                        <IconButton
                            icon="more"
                            size="square_sm"
                            tooltipOptions={{
                                trigger: 'click',
                            }}
                            data-testid="message-more-options-button"
                            tooltip={<Submenu items={submenuItems} />}
                        />
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

const Submenu = (props: {
    items: {
        key: string
        icon: IconName
        text: string
        disabled?: boolean
        color?: BoxProps['color']
        shortcutAction?: ShortcutAction
        onClick?: () => void
    }[]
}) => {
    const tooltipContext = useContext(TooltipContext)
    const numItems = props.items.length
    return (
        <Box paddingRight="x4" paddingY="sm" inset="xs" pointerEvents="all">
            <Box background="level2" rounded="md" boxShadow="card">
                {props.items.map((item, i) => {
                    const isFirst = i === 0
                    const isLast = i === numItems - 1
                    return (
                        <Stack
                            horizontal
                            hoverable
                            key={item.key}
                            cursor="pointer"
                            background="level2"
                            gap="sm"
                            alignItems="center"
                            padding="md"
                            paddingBottom={!isLast ? 'sm' : 'md'}
                            paddingTop={isFirst ? 'md' : 'sm'}
                            roundedTop={isFirst ? 'md' : 'none'}
                            roundedBottom={isLast ? 'md' : 'none'}
                            color={item.color}
                            data-testid={`more-options-menu-${item.key}-button`}
                            onClick={() => {
                                item.onClick?.()
                                tooltipContext?.close?.()
                            }}
                        >
                            <IconButton background="level3" icon={item.icon} color={item.color} />
                            <Paragraph>{item.text}</Paragraph>
                            <Box grow horizontal justifyContent="end">
                                {item.shortcutAction && ShortcutActions[item.shortcutAction] && (
                                    <ShortcutKeys
                                        keys={ShortcutActions[item.shortcutAction].keys as string}
                                        size="sm"
                                    />
                                )}
                            </Box>
                        </Stack>
                    )
                })}
            </Box>
        </Box>
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
