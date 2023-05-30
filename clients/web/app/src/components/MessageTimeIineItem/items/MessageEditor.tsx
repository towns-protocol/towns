import React, { useCallback, useContext } from 'react'
import {
    RoomIdentifier,
    RoomMessageEvent,
    SendTextMessageOptions,
    useMyProfile,
    useSpaceMembers,
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
    channelId: RoomIdentifier
    initialValue: string
}

export const TimelineMessageEditor = (props: Props) => {
    const { isMobile } = useDevice()
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

    const { members } = useSpaceMembers()
    const userId = useMyProfile()?.userId
    const channels = useSpaceChannels()

    return isMobile ? (
        <TouchEditMessageWrapper onCancel={onCancel}>
            <Box grow />
            <Box padding borderTop background="level1">
                <Stack rounded="sm" background="level2">
                    <RichTextEditor
                        autoFocus
                        editable
                        editing
                        displayButtons
                        initialValue={initialValue}
                        channels={channels}
                        members={members}
                        userId={userId}
                        onSend={onSend}
                        onCancel={onCancel}
                    />
                </Stack>
            </Box>
        </TouchEditMessageWrapper>
    ) : (
        <Stack gap>
            <RichTextEditor
                editable
                editing
                displayButtons
                initialValue={initialValue}
                channels={channels}
                members={members}
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
    const root = useZLayerContext().rootLayerRef?.current
    if (!root) {
        console.error(`no root context declared for use of modal`)
        return null
    }

    return createPortal(
        <Box background="cta1" border="quote" zIndex="tooltips" pointerEvents="auto">
            <Box absoluteFill>
                <Box absoluteFill onClick={props.onCancel} />
                {props.children}
            </Box>
        </Box>,
        root,
    )
}
