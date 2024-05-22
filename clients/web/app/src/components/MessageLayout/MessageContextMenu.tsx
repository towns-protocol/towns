import React, { useCallback, useContext, useRef } from 'react'
import { Permission, useConnectivity, useHasPermission, useTownsClient } from 'use-towns-client'
import { isDefined } from '@river/sdk'
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
import { useAnalytics } from 'hooks/useAnalytics'
import { useRouteParams } from 'hooks/useRouteParams'
import { ShortcutAction, ShortcutActions } from 'data/shortcuts'
import { ShortcutKeys } from '@components/Shortcuts/ShortcutKeys'
import { useCreateUnreadMarker } from './hooks/useCreateUnreadMarker'
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
    const { analytics } = useAnalytics()
    const { threadId } = useRouteParams()

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
            analytics?.track('reacted with emoji', { spaceId, channelId, emojiId: data.id }, () => {
                console.log('[analytics] reacted with emoji')
            })
            sendReaction(channelId, eventId, data.id, threadId)
        },
        [analytics, channelId, eventId, sendReaction, spaceId, threadId],
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
            const link = getLinkToMessage({ spaceId, channelId, eventId, threadId: threadParentId })
            if (link) {
                copy(link)
            }
        }, [channelId, copy, eventId, spaceId, threadParentId]),
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
                    {props.canReact && (
                        <EmojiPickerButton
                            parentFocused
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
                            onClick={onReply}
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

                    {(props.canEdit || (canRedact && spaceId)) && (
                        <IconButton
                            icon="more"
                            size="square_sm"
                            tooltipOptions={{
                                trigger: 'click',
                            }}
                            tooltip={
                                <Box paddingRight="x4" paddingY="sm" inset="xs" pointerEvents="all">
                                    <Submenu
                                        items={[
                                            props.canEdit
                                                ? ({
                                                      key: 'edit',
                                                      disabled: !props.canEdit,
                                                      icon: 'edit',
                                                      text: 'Edit message',
                                                      shortcutAction: 'EditMessage' as const,
                                                      onClick: onEditClick,
                                                  } as const)
                                                : undefined,
                                            props.canEdit || (canRedact && spaceId)
                                                ? ({
                                                      key: 'delete',
                                                      icon: 'delete',
                                                      text: 'Delete message',
                                                      color: 'error',
                                                      shortcutAction: 'DeleteMessage' as const,
                                                      onClick: props.canEdit
                                                          ? onDeleteClick
                                                          : onAdminRedact,
                                                  } as const)
                                                : undefined,
                                        ].filter(isDefined)}
                                    />
                                </Box>
                            }
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
    const numItems = props.items.length
    return (
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
                        onClick={item.onClick}
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
