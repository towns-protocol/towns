import React, { useCallback, useContext, useEffect, useRef } from 'react'
import { RoomIdentifier, useZionClient } from 'use-zion-client'
import { EmojiPickerButton } from '@components/EmojiPickerButton'
import { Box, IconButton, MotionStack, Stack } from '@ui'
import { useOpenMessageThread } from 'hooks/useOpenThread'
import { vars } from 'ui/styles/vars.css'
import { MessageTimelineContext } from '@components/MessageTimeline/MessageTimelineContext'
import { DeleteMessagePrompt } from './DeleteMessagePrompt'

type Props = {
    eventId: string
    channelId?: RoomIdentifier
    spaceId?: RoomIdentifier
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
        timelineContext?.timelineActions.onSelectEditingMessage(eventId)
    }, [eventId, timelineContext])

    const onSelectEmoji = useCallback(
        (data: EmojiPickerSelection) => {
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

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (!document.activeElement?.contains(ref.current)) {
                return
            }
            if (props.canReply && e.key === 't') {
                onThreadClick()
                e.preventDefault()
            }
            if (props.canEdit && e.key === 'e') {
                onEditClick()
                e.preventDefault()
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => {
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [onEditClick, onThreadClick, props.canEdit, props.canReply])

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
                        <IconButton icon="edit" size="square_sm" onClick={onEditClick} />
                    )}

                    {props.canReply && (
                        <IconButton icon="threads" size="square_sm" onClick={onThreadClick} />
                    )}
                    {props.canReact && <EmojiPickerButton onSelectEmoji={onSelectEmoji} />}
                    {props.canEdit && (
                        <IconButton
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
