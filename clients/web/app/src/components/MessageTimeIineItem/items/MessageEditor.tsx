import React, { useCallback, useContext } from 'react'
import {
    RoomIdentifier,
    RoomMessageEvent,
    SendTextMessageOptions,
    useMyProfile,
    useSpaceMembers,
} from 'use-zion-client'
import { RichTextEditor } from '@components/RichText/RichTextEditor'
import { Stack } from '@ui'
import { useEditMessage } from 'hooks/useEditMessage'
import { MessageTimelineContext } from '@components/MessageTimeline/MessageTimelineContext'
import { useSpaceChannels } from 'hooks/useSpaceChannels'

export const TimelineMessageEditor = (props: {
    eventId: string
    eventContent: RoomMessageEvent
    channelId: RoomIdentifier
    initialValue: string
}) => {
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

    return (
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
