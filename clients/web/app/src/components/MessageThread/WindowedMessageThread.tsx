import React, { useMemo } from 'react'
import { TimelineEvent, useTimelineThread } from 'use-zion-client'
import { useChannelContext } from 'use-zion-client/dist/components/ChannelContextProvider'
import { MessageTimeline } from '@components/MessageTimeline/MessageTimeline'
import {
    MessageTimelineType,
    MessageTimelineWrapper,
} from '@components/MessageTimeline/MessageTimelineContext'
import { RichTextEditor } from '@components/RichText/RichTextEditor'
import { Box, IconButton, Stack } from '@ui'
import { useSendReply } from 'hooks/useSendReply'

type Props = {
    messageId: string
    onClose?: () => void
    channelMessages: TimelineEvent[]
}
export const WindowedMessageThread = (props: Props) => {
    const { channelId, spaceId } = useChannelContext()
    const { messageId } = props

    const { parent, messages } = useTimelineThread(channelId, messageId)
    const parentMessage = parent?.parentEvent

    const messagesWithParent = useMemo(() => {
        return parentMessage ? [parentMessage, ...messages] : messages
    }, [messages, parentMessage])

    const { sendReply } = useSendReply(messageId)

    const onSend = (value: string) => {
        sendReply(value, channelId)
    }

    // const parentMessageContent = getIsRoomMessageContent(parentMessage)

    return (
        <MessageTimelineWrapper
            spaceId={spaceId}
            channelId={channelId}
            type={MessageTimelineType.Thread}
            events={messagesWithParent}
        >
            <MessageWindow label="Thread" onClose={props.onClose}>
                <Stack grow overflow="hidden">
                    <MessageTimeline />
                </Stack>
            </MessageWindow>
            <Box paddingY="none" style={{ position: 'sticky', bottom: 0 }}>
                <RichTextEditor editable placeholder="Reply..." onSend={onSend} />
            </Box>
        </MessageTimelineWrapper>
    )
}

const MessageWindow = (props: {
    children: React.ReactNode
    label?: React.ReactNode | string
    onClose?: () => void
}) => {
    return (
        <Box border rounded="sm" overflow="hidden" maxHeight="100%">
            <Stack
                horizontal
                paddingX="md"
                background="level2"
                minHeight="x6"
                alignItems="center"
                color="gray1"
            >
                <Box grow color="gray2">
                    {props.label}
                </Box>
                <Box>{props.onClose && <IconButton icon="close" onClick={props.onClose} />}</Box>
            </Stack>
            {props.children}
        </Box>
    )
}
