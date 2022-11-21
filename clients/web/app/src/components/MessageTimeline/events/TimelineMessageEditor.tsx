import React, { useCallback, useContext } from 'react'
import { RoomIdentifier, SendTextMessageOptions } from 'use-zion-client'
import { RichTextEditor } from '@components/RichText/RichTextEditor'
import { Stack } from '@ui'
import { useEditMessage } from 'hooks/useEditMessage'
import { MessageTimelineContext } from '@components/MessageTimeline/MessageTimelineContext'

export const TimelineMessageEditor = (props: {
    eventId: string
    channelId: RoomIdentifier
    initialValue: string
}) => {
    const { initialValue, channelId, eventId } = props
    const { timelineActions } = useContext(MessageTimelineContext) ?? {}
    const editChannelEvent = useEditMessage(channelId)

    const onSend = useCallback(
        (value: string, options: SendTextMessageOptions | undefined) => {
            editChannelEvent({ parentId: eventId, value }, options)
            timelineActions?.onCancelEditingMessage?.()
        },
        [editChannelEvent, eventId, timelineActions],
    )

    const onCancel = useCallback(() => {
        timelineActions?.onCancelEditingMessage?.()
    }, [timelineActions])

    return (
        <Stack gap>
            <RichTextEditor
                editable
                editing
                displayButtons
                initialValue={initialValue}
                onSend={onSend}
                onCancel={onCancel}
            />
        </Stack>
    )
}
