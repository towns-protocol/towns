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
import { Box, Paragraph, Stack } from '@ui'
import { useIsChannelWritable } from 'hooks/useIsChannelWritable'
import { useSendReply } from 'hooks/useSendReply'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { atoms } from 'ui/styles/atoms.css'
import { useDevice } from 'hooks/useDevice'
import { useAuth } from 'hooks/useAuth'
import { Panel } from '@components/Panel/Panel'
import { MediaDropContextProvider } from '@components/MediaDropContext/MediaDropContext'

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

    const imageUploadTitle = isChannelWritable
        ? `Upload to thread`
        : isChannelWritable === false
        ? `You don't have permission to send media to this channel`
        : `Loading permissions`

    return (
        <Panel label={panelLabel} onClose={props.onClose}>
            <MediaDropContextProvider
                title={imageUploadTitle}
                id={messageId}
                key={messageId}
                disableDrop={!isChannelWritable}
            >
                <Stack
                    grow
                    position="relative"
                    overflow="hidden"
                    justifyContent={{ default: 'start', touch: 'end' }}
                    width="100%"
                >
                    <Box justifySelf="end" overflow="hidden">
                        <MessageTimelineWrapper
                            spaceId={spaceId}
                            channelId={channelId}
                            threadParentId={messageId}
                            events={messagesWithParent}
                            isChannelWritable={isChannelWritable}
                        >
                            <MessageTimeline
                                align="top"
                                highlightId={props.highlightId}
                                groupByUser={false}
                            />
                        </MessageTimelineWrapper>
                    </Box>
                </Stack>
                {isChannelWritable && (
                    <Box
                        paddingX={{ default: 'md', touch: 'none' }}
                        paddingBottom={{ default: 'lg', touch: 'none' }}
                        paddingTop={{ default: 'none', touch: 'none' }}
                        bottom={isTouch ? 'sm' : 'none'}
                    >
                        <RichTextEditor
                            isFullWidthOnTouch
                            autoFocus={!isTouch}
                            editable={!!isChannelWritable}
                            displayButtons="on-focus"
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
            </MediaDropContextProvider>
        </Panel>
    )
}
