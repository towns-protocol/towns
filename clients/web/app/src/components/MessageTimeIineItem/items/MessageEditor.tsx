import React, { useCallback, useContext } from 'react'
import {
    RoomMessageEvent,
    SendTextMessageOptions,
    useMyProfile,
    useUserLookupContext,
} from 'use-zion-client'
import { createPortal } from 'react-dom'
import { Box, Stack, useZLayerContext } from '@ui'
import { RichTextEditor } from '@components/RichText/RichTextEditor'
import { useEditMessage } from 'hooks/useEditMessage'
import { MessageTimelineContext } from '@components/MessageTimeline/MessageTimelineContext'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { useDevice } from 'hooks/useDevice'

type Props = {
    eventId: string
    eventContent: RoomMessageEvent
    channelId: string
    initialValue: string
}

export const TimelineMessageEditor = (props: Props) => {
    const { isTouch } = useDevice()
    const { initialValue, channelId, eventId, eventContent } = props
    const { timelineActions } = useContext(MessageTimelineContext) ?? {}
    const editChannelEvent = useEditMessage(channelId)

    const onSend = useCallback(
        (value: string, options: SendTextMessageOptions | undefined) => {
            editChannelEvent({ eventId, value }, eventContent, options)
            timelineActions?.onCancelEditingMessage?.()
        },
        [editChannelEvent, eventContent, eventId, timelineActions],
    )

    const onCancel = useCallback(() => {
        timelineActions?.onCancelEditingMessage?.()
    }, [timelineActions])

    const { users: members } = useUserLookupContext()
    const userId = useMyProfile()?.userId
    const channels = useSpaceChannels()

    return isTouch ? (
        <TouchEditMessageWrapper onCancel={onCancel}>
            <Box grow />
            <RichTextEditor
                autoFocus
                editable
                editing
                displayButtons="always"
                initialValue={initialValue}
                channels={channels}
                users={members}
                userId={userId}
                onSend={onSend}
                onCancel={onCancel}
            />
        </TouchEditMessageWrapper>
    ) : (
        <Stack gap>
            <RichTextEditor
                editable
                editing
                displayButtons="always"
                initialValue={initialValue}
                channels={channels}
                users={members}
                userId={userId}
                onSend={onSend}
                onCancel={onCancel}
            />
        </Stack>
    )
}

export const TouchEditMessageWrapper = (props: {
    children: React.ReactNode
    onCancel: () => void
}) => {
    const { onCancel } = props
    const backgroundPressed = useCallback(
        (event: React.MouseEvent) => {
            event.preventDefault()
            event.stopPropagation()
            onCancel()
        },
        [onCancel],
    )

    const root = useZLayerContext().rootLayerRef?.current
    if (!root) {
        console.error(`no root context declared for use of modal`)
        return null
    }

    return createPortal(
        <Box zIndex="tooltips" pointerEvents="auto">
            <Box absoluteFill onClick={backgroundPressed} />
            <Box position="absolute" bottom="none" right="none" left="none">
                {props.children}
            </Box>
        </Box>,
        root,
    )
}
