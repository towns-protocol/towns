import React, { useMemo } from 'react'
import {
    SendMessageOptions,
    useChannelContext,
    useChannelData,
    useMyProfile,
    useSpaceMembers,
    useTimelineThread,
} from 'use-zion-client'
import { MessageTimeline } from '@components/MessageTimeline/MessageTimeline'
import { MessageTimelineWrapper } from '@components/MessageTimeline/MessageTimelineContext'
import { RichTextEditor } from '@components/RichText/RichTextEditor'
import { Box, Panel, Paragraph, Stack } from '@ui'
import { useIsChannelWritable } from 'hooks/useIsChannelWritable'
import { useSendReply } from 'hooks/useSendReply'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { atoms } from 'ui/styles/atoms.css'
import { useDevice } from 'hooks/useDevice'
import { useAuth } from 'hooks/useAuth'

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
        sendReply(value, channelId, options, parent?.userIds)
    }
    const { members } = useSpaceMembers()
    const userId = useMyProfile()?.userId
    const { loggedInWalletAddress } = useAuth()
    const channels = useSpaceChannels()
    const { isTouch } = useDevice()

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

    const { isChannelWritable } = useIsChannelWritable(spaceId, channelId, loggedInWalletAddress)

    return (
        <Panel label={panelLabel} onClose={props.onClose}>
            <Stack grow>
                <MessageTimelineWrapper
                    spaceId={spaceId}
                    channelId={channelId}
                    threadParentId={messageId}
                    events={messagesWithParent}
                    isChannelWritable={isChannelWritable}
                >
                    <Stack grow overflow="hidden">
                        <MessageTimeline highlightId={props.highlightId} />
                    </Stack>
                </MessageTimelineWrapper>

                {isChannelWritable && (
                    <Box paddingX="md" position="sticky" bottom={isTouch ? 'sm' : 'none'}>
                        <RichTextEditor
                            autoFocus={!isTouch}
                            editable={!!isChannelWritable}
                            displayButtons={isTouch ? 'on-focus' : 'never'}
                            placeholder="Reply..."
                            storageId={`${channelId.networkId}-${messageId}`}
                            threadId={messageId}
                            channels={channels}
                            members={members}
                            background="level2"
                            userId={userId}
                            onSend={onSend}
                        />
                    </Box>
                )}
            </Stack>
        </Panel>
    )
}
