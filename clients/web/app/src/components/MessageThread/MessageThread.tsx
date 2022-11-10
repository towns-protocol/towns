import React from 'react'
import { RoomIdentifier, useTimelineThread } from 'use-zion-client'
import { TimelineMessage } from '@components/MessageTimeline/events/TimelineMessage'
import {
    MessageTimelineType,
    MessageTimelineWrapper,
} from '@components/MessageTimeline/MessageTimelineContext'
import { RichTextEditor } from '@components/RichText/RichTextEditor'
import { Box, Paragraph, Stack } from '@ui'
import { useSendReply } from 'hooks/useSendReply'
import { MessageTimeline } from '@components/MessageTimeline/MessageTimeline'

export const MessageThread = (props: {
    userId: string
    channelLabel: string
    parentId: string
    channelId: RoomIdentifier
    spaceId: RoomIdentifier
}) => {
    const { parentId, spaceId, channelId, channelLabel } = props
    const { parent, messages } = useTimelineThread(channelId, parentId)
    const parentMessage = parent?.parentEvent
    const parentMessageContent = parent?.parentMessageContent

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
