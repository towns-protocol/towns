import React from 'react'
import { useChannelTimeline, useMatrixStore } from 'use-zion-client'
import { useChannelContext } from 'use-zion-client/dist/components/ChannelContextProvider'
import { TimelineMessage } from '@components/MessageTimeline/events/TimelineMessage'
import { MessageTimeline, MessageTimelineType } from '@components/MessageTimeline/MessageTimeline'
import { RichTextEditor } from '@components/RichText/RichTextEditor'
import { Box, Divider, IconButton, Stack } from '@ui'
import { useMessageThread } from 'hooks/useFixMeMessageThread'
import { useHandleReaction, useTimelineReactionsMap } from 'hooks/useReactions'
import { useSendReply } from 'hooks/useSendReply'
import { getIsRoomMessageContent } from 'utils/ztevent_util'

type Props = {
    messageId: string
    onClose?: () => void
}
export const MessageThread = (props: Props) => {
    const { userId } = useMatrixStore()
    const { channelId, spaceId } = useChannelContext()

    const { messageId } = props
    const { parentMessage, messages } = useMessageThread(messageId)
    const { sendReply } = useSendReply(messageId)

    const onSend = (value: string) => {
        sendReply(value)
    }

    const parentMessageContent = getIsRoomMessageContent(parentMessage)
    const channelMessages = useChannelTimeline()

    // could be optimised - only need the segment of the thread
    const messageReactionsMap = useTimelineReactionsMap(channelMessages)

    const handleReaction = useHandleReaction(channelId)

    return (
        <Stack absoluteFill padding gap position="relative">
            <MessageWindow label="Thread" onClose={props.onClose}>
                <Stack scroll grow paddingY="md">
                    {parentMessage && parentMessageContent && (
                        <TimelineMessage
                            relativeDate
                            userId={userId}
                            channelId={channelId}
                            event={parentMessage}
                            eventContent={parentMessageContent}
                            spaceId={spaceId}
                            onReaction={handleReaction}
                        />
                    )}
                    {!!messages.length && (
                        <Box paddingX="md" paddingTop="md">
                            <Divider space="none" />
                        </Box>
                    )}
                    <Stack paddingTop="sm">
                        <MessageTimeline
                            type={MessageTimelineType.Thread}
                            events={messages}
                            spaceId={spaceId}
                            channelId={channelId}
                            messageReactionsMap={messageReactionsMap}
                        />
                    </Stack>
                </Stack>
            </MessageWindow>
            <Box paddingY="none" style={{ position: 'sticky', bottom: 0 }}>
                <RichTextEditor editable placeholder="Reply..." onSend={onSend} />
            </Box>
        </Stack>
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
            <Box scroll>{props.children}</Box>
        </Box>
    )
}
