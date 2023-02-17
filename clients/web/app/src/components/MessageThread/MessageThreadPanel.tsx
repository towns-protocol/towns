import React, { useMemo } from 'react'
import {
    SendMessageOptions,
    useChannelContext,
    useChannelData,
    useTimelineThread,
} from 'use-zion-client'
import { MessageTimeline } from '@components/MessageTimeline/MessageTimeline'
import { MessageTimelineWrapper } from '@components/MessageTimeline/MessageTimelineContext'
import { RichTextEditor } from '@components/RichText/RichTextEditor'
import { Box, Panel, Paragraph, Stack } from '@ui'
import { useSendReply } from 'hooks/useSendReply'
import { atoms } from 'ui/styles/atoms.css'

type Props = {
    messageId: string
    onClose?: () => void
    highlightId?: string
}
export const MessageThreadPanel = (props: Props) => {
    const { channelId, spaceId } = useChannelContext()

    const channelLabel = useChannelData().channel?.label
    const { messageId } = props
    const { parent, messages } = useTimelineThread(channelId, messageId)
    const parentMessage = parent?.parentEvent

    const messagesWithParent = useMemo(() => {
        return parentMessage ? [parentMessage, ...messages] : messages
    }, [messages, parentMessage])

    const { sendReply } = useSendReply(messageId)

    const onSend = (value: string, options: SendMessageOptions | undefined) => {
        sendReply(value, channelId, options)
    }
    const panelLabel = (
        <Paragraph>
            Thread{' '}
            {channelLabel ? (
                <>
                    in <span className={atoms({ color: 'default' })}>#{channelLabel}</span>
                </>
            ) : null}
        </Paragraph>
    )
    return (
        <MessageTimelineWrapper
            spaceId={spaceId}
            channelId={channelId}
            threadParentId={messageId}
            events={messagesWithParent}
        >
            <Panel label={panelLabel} onClose={props.onClose}>
                <Stack grow overflow="hidden">
                    <MessageTimeline highlightId={props.highlightId} />
                </Stack>
            </Panel>
            <Box paddingY="none" paddingX="md" style={{ position: 'sticky', bottom: 0 }}>
                <RichTextEditor
                    editable
                    placeholder="Reply..."
                    storageId={`${channelId.networkId}-${messageId}`}
                    onSend={onSend}
                />
            </Box>
        </MessageTimelineWrapper>
    )
}
