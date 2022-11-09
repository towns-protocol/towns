import { EmojiData } from 'emoji-mart'
import React, { useCallback, useContext } from 'react'
import { RoomIdentifier, useZionClient } from 'use-zion-client'
import { motion } from 'framer-motion'
import { EmojiPickerButton } from '@components/EmojiPickerButton'
import { IconButton, Stack } from '@ui'
import { useOpenMessageThread } from 'hooks/useOpenThread'
import { vars } from 'ui/styles/vars.css'
import { MessageTimelineContext } from '@components/MessageTimeline/MessageTimelineContext'

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

    const { sendReaction } = useZionClient()
    const timelineContext = useContext(MessageTimelineContext)

    const { onOpenMessageThread } = useOpenMessageThread(spaceId, channelId)

    const onThreadClick = useCallback(() => {
        onOpenMessageThread(eventId)
    }, [eventId, onOpenMessageThread])

    const onEditClick = useCallback(() => {
        console.log('edit', eventId)
        timelineContext?.timelineActions.onSelectEditingMessage(eventId)
    }, [eventId, timelineContext])

    const onSelectEmoji = useCallback(
        (data: EmojiData) => {
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

    return (
        <MotionStack pointerEvents="auto" position="topRight" {...animation}>
            <Stack
                border
                horizontal
                background="level1"
                color="gray2"
                gap="xs"
                padding="xs"
                rounded="sm"
                style={style}
                width="auto"
            >
                {props.canEdit && <IconButton icon="edit" size="square_sm" onClick={onEditClick} />}
                {props.canReply && (
                    <IconButton icon="threads" size="square_sm" onClick={onThreadClick} />
                )}
                {props.canReact && <EmojiPickerButton onSelectEmoji={onSelectEmoji} />}
            </Stack>
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

const MotionStack = motion(Stack)
