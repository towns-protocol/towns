import React from 'react'
import { RoomIdentifier, useChannelTimeline } from 'use-zion-client'
import { MessageTimeline } from '@components/MessageTimeline'
import { TimelineMessage } from '@components/MessageTimeline/events/TimelineMessage'
import {
    MessageTimelineType,
    MessageTimelineWrapper,
} from '@components/MessageTimeline/MessageTimelineContext'
import { RichTextEditor } from '@components/RichText/RichTextEditor'
import { Box, Paragraph, Stack } from '@ui'
import { useMessageThread } from 'hooks/useFixMeMessageThread'
import { useSendReply } from 'hooks/useSendReply'
import { getIsRoomMessageContent } from 'utils/ztevent_util'

export const MessageThread = (props: {
    userId: string
    channelLabel: string
    parentId: string
    channelId: RoomIdentifier
    spaceId: RoomIdentifier
}) => {
    const { parentId, spaceId, channelId, channelLabel } = props

    const channelMessages = useChannelTimeline()

    const { parentMessage, messages } = useMessageThread(parentId, channelMessages)

    const parentMessageContent = getIsRoomMessageContent(parentMessage)

    const { sendReply } = useSendReply(parentId)

    const onSend = (value: string) => {
        sendReply(value, channelId)
    }

    return (
        <MessageTimelineWrapper
            type={MessageTimelineType.Thread}
            events={messages}
            spaceId={spaceId}
            channelId={channelId}
        >
            <Stack gap padding>
                <Box>
                    <Paragraph color="gray2">#{channelLabel.toLocaleLowerCase()}</Paragraph>
                </Box>
                <Stack scroll grow border rounded="sm" background="level1">
                    {parentMessage && parentMessageContent && (
                        <TimelineMessage
                            event={parentMessage}
                            eventContent={parentMessageContent}
                        />
                    )}
                    <Stack borderTop>
                        <MessageTimeline />
                        <Box padding>
                            <RichTextEditor
                                editable
                                autoFocus={false}
                                placeholder="Reply..."
                                onSend={onSend}
                            />
                        </Box>
                    </Stack>
                </Stack>
            </Stack>
        </MessageTimelineWrapper>
    )
}
