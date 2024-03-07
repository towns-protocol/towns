import React, { useCallback, useContext } from 'react'
import {
    Attachment,
    RoomMessageEvent,
    SendTextMessageOptions,
    useMyProfile,
    useUserLookupContext,
} from 'use-zion-client'
import { createPortal } from 'react-dom'
import { Box, Stack, useZLayerContext } from '@ui'
import { RichTextEditor } from '@components/RichTextPlate/PlateEditor'
import { useEditMessage } from 'hooks/useEditMessage'
import { MessageTimelineContext } from '@components/MessageTimeline/MessageTimelineContext'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { useDevice } from 'hooks/useDevice'
import { MediaDropContextProvider } from '@components/MediaDropContext/MediaDropContext'

type Props = {
    eventId: string
    eventContent: RoomMessageEvent
    channelId: string
    spaceId: string | undefined
    initialValue: string
    attachments?: Attachment[]
}

export const TimelineMessageEditor = (props: Props) => {
    const { isTouch } = useDevice()
    const { attachments, initialValue, channelId, spaceId, eventId, eventContent } = props
    const { timelineActions } = useContext(MessageTimelineContext) ?? {}
    const editChannelEvent = useEditMessage(channelId)

    const onSend = useCallback(
        (value: string, options: SendTextMessageOptions | undefined) => {
            if (options) {
                options.attachments = [...(attachments ?? []), ...(options.attachments ?? [])]
            }
            editChannelEvent({ eventId, value }, eventContent, options)
            timelineActions?.onCancelEditingMessage?.()
        },
        [editChannelEvent, eventContent, eventId, timelineActions, attachments],
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
            <MediaDropContextProvider
                channelId={channelId}
                spaceId={spaceId}
                title=""
                eventId={eventId}
            >
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
            </MediaDropContextProvider>
        </TouchEditMessageWrapper>
    ) : (
        <Stack gap>
            <MediaDropContextProvider
                channelId={channelId}
                spaceId={spaceId}
                title=""
                eventId={eventId}
            >
                <RichTextEditor
                    editable
                    editing
                    autoFocus
                    displayButtons="always"
                    initialValue={initialValue}
                    channels={channels}
                    users={members}
                    userId={userId}
                    onSend={onSend}
                    onCancel={onCancel}
                />
            </MediaDropContextProvider>
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
