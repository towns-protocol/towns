import React, { useCallback, useContext, useRef } from 'react'
import { useZionClient } from 'use-zion-client'
import { EmojiPickerButton } from '@components/EmojiPickerButton'
import { Box, IconButton, MotionStack, Stack } from '@ui'
import { useOpenMessageThread } from 'hooks/useOpenThread'
import { vars } from 'ui/styles/vars.css'
import { MessageTimelineContext } from '@components/MessageTimeline/MessageTimelineContext'
import { useShortcut } from 'hooks/useShortcut'
import { ShortcutTooltip } from '@components/Shortcuts/ShortcutTooltip'
import useCopyToClipboard from 'hooks/useCopyToClipboard'
import { PATHS } from 'routes'
import { DeleteMessagePrompt } from './DeleteMessagePrompt'

type Props = {
    eventId: string
    channelId?: string
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
    const { eventId, channelId, spaceId } = props

    const { redactEvent, sendReaction } = useZionClient()
    const timelineContext = useContext(MessageTimelineContext)

    const { onOpenMessageThread } = useOpenMessageThread(spaceId, channelId)

    const onThreadClick = useCallback(() => {
        onOpenMessageThread(eventId)
    }, [eventId, onOpenMessageThread])

    const onEditClick = useCallback(() => {
        timelineContext?.timelineActions?.onSelectEditingMessage(eventId)
    }, [eventId, timelineContext])

    const [copiedText, copy] = useCopyToClipboard()
    const hasCopied = !!copiedText

    const onCopyLinkToMessage = useCallback(() => {
        console.log('Copy link to message')
        const link = `/${PATHS.SPACES}/${spaceId}/${PATHS.CHANNELS}/${channelId}#${eventId}`
        if (link) {
            copy(`${location.origin}${link}`)
        }
    }, [channelId, copy, eventId, spaceId])

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

    const [showDeletePrompt, setShowDeletePrompt] = React.useState(false)

    const onDeleteClick = useCallback(() => {
        if (channelId && eventId) {
            setShowDeletePrompt(true)
        }
    }, [channelId, eventId])

    const onDeleteConfirm = useCallback(() => {
        if (channelId) {
            redactEvent(channelId, eventId)
        }
    }, [channelId, eventId, redactEvent])

    const onDeleteCancel = useCallback(() => {
        setShowDeletePrompt(false)
    }, [])

    useShortcut(
        'EditMessage',
        useCallback(() => {
            if (props.canEdit) {
                timelineContext?.timelineActions?.onSelectEditingMessage(props.eventId)
            }
        }, [props.canEdit, props.eventId, timelineContext?.timelineActions]),
        { enableOnContentEditable: false },
        [],
    )
    useShortcut(
        'ReplyToMessage',
        useCallback(() => {
            if (props.canReply) {
                onOpenMessageThread(props.eventId)
            }
        }, [onOpenMessageThread, props.canReply, props.eventId]),
        { enableOnContentEditable: false },
        [],
    )

    useShortcut(
        'DeleteMessage',
        useCallback(() => {
            if (props.canEdit) {
                setShowDeletePrompt(true)
            }
        }, [props.canEdit]),
        { enableOnContentEditable: false },
        [],
    )

    useShortcut(
        'CopyLinkToMessage',
        useCallback(() => {
            console.log('Copy link to message')
        }, []),
        { enableOnContentEditable: false },
        [],
    )

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
                            icon="threads"
                            size="square_sm"
                            tooltip={<ShortcutTooltip action="ReplyToMessage" />}
                            onClick={onThreadClick}
                        />
                    )}
                    {props.canReact && (
                        <EmojiPickerButton
                            parentFocused
                            tooltip={<ShortcutTooltip action="ReactToMessage" />}
                            onSelectEmoji={onSelectEmoji}
                        />
                    )}
                    <IconButton
                        color={hasCopied ? 'positive' : 'gray2'}
                        tooltip={
                            hasCopied ? 'Copied!' : <ShortcutTooltip action="CopyLinkToMessage" />
                        }
                        icon="link"
                        size="square_sm"
                        onClick={onCopyLinkToMessage}
                    />
                    {props.canEdit && (
                        <IconButton
                            tooltip={<ShortcutTooltip action="DeleteMessage" />}
                            icon="delete"
                            size="square_sm"
                            color="error"
                            onClick={onDeleteClick}
                        />
                    )}
                </Stack>
            </Box>
            {showDeletePrompt && (
                <DeleteMessagePrompt
                    onDeleteCancel={onDeleteCancel}
                    onDeleteConfirm={onDeleteConfirm}
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
