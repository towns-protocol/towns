import React, { useMemo } from 'react'
import {
    SendMessageOptions,
    useChannelContext,
    useChannelData,
    useConnectivity,
    useMyProfile,
    useTimelineThread,
    useUserLookupContext,
} from 'use-towns-client'
import { useLocation } from 'react-router'
import { MessageTimeline } from '@components/MessageTimeline/MessageTimeline'
import { MessageTimelineWrapper } from '@components/MessageTimeline/MessageTimelineContext'
import { RichTextEditor } from '@components/RichTextPlate/PlateEditor'
import { Box, Paragraph, Stack } from '@ui'
import { useIsChannelWritable } from 'hooks/useIsChannelWritable'
import { useSendReply } from 'hooks/useSendReply'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { atoms } from 'ui/styles/atoms.css'
import { useDevice } from 'hooks/useDevice'
import { Panel } from '@components/Panel/Panel'
import { MediaDropContextProvider } from '@components/MediaDropContext/MediaDropContext'

type Props = {
    messageId: string
    highlightId?: string
    parentRoute?: string
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
    const { users } = useUserLookupContext()

    const userId = useMyProfile()?.userId
    const { loggedInWalletAddress } = useConnectivity()
    const channels = useSpaceChannels()
    const { isTouch } = useDevice()

    const location = useLocation()

    const highlightId = useMemo(() => {
        const eventHash = location.hash?.replace(/^#/, '')
        return eventHash?.match(/^[a-z0-9_-]{16,128}/i)
            ? messages.some((m) => m.eventId === eventHash)
                ? eventHash
                : undefined
            : undefined
    }, [location.hash, messages])

    const panelLabel = (
        <Paragraph truncate>
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
        <Panel label={panelLabel} padding="none" gap="none" parentRoute={props.parentRoute}>
            <MediaDropContextProvider
                title={imageUploadTitle}
                channelId={channelId}
                spaceId={spaceId}
                eventId={messageId}
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
                    <MessageTimelineWrapper
                        spaceId={spaceId}
                        channelId={channelId}
                        threadParentId={messageId}
                        events={messagesWithParent}
                        isChannelWritable={isChannelWritable}
                    >
                        <MessageTimeline
                            align="bottom"
                            highlightId={highlightId}
                            groupByUser={false}
                        />
                    </MessageTimelineWrapper>
                </Stack>
                {isChannelWritable && (
                    <Box
                        paddingX={{ default: 'md', touch: 'none' }}
                        paddingBottom={{ default: 'md', touch: 'none' }}
                        paddingTop={{ default: 'none', touch: 'none' }}
                        bottom={isTouch ? 'sm' : 'none'}
                    >
                        <RichTextEditor
                            isFullWidthOnTouch
                            key={`${messageId}-${isChannelWritable ? '' : '-readonly'}`}
                            autoFocus={!isTouch}
                            editable={!!isChannelWritable}
                            displayButtons="on-focus"
                            placeholder="Reply..."
                            storageId={`${channelId}-${messageId}`}
                            threadId={messageId}
                            channels={channels}
                            users={users}
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
