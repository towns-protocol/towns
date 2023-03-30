import React, { useMemo } from 'react'
import {
    RoomIdentifier,
    SendMessageOptions,
    ZTEvent,
    useMyProfile,
    useSpaceMembers,
    useTimelineThread,
} from 'use-zion-client'
import { MessageTimeline } from '@components/MessageTimeline/MessageTimeline'
import { MessageTimelineWrapper } from '@components/MessageTimeline/MessageTimelineContext'
import { RichTextEditor } from '@components/RichText/RichTextEditor'
import { Box, Paragraph, Stack } from '@ui'
import { useSendReply } from 'hooks/useSendReply'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { useIsChannelWritable } from 'hooks/useIsChannelWritable'

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

    const { sendReply } = useSendReply(parentId)

    const onSend = (value: string, options: SendMessageOptions | undefined) => {
        sendReply(value, channelId, options)
    }

    const profile = useMyProfile()
    const usernames = useMemo(() => {
        const names = Object.values(
            messages.reduce(
                (users, m) => {
                    if (m.content?.kind === ZTEvent.RoomMessage) {
                        const sender = m.sender
                        if (sender.id !== profile?.userId) {
                            users[sender.id] = sender.displayName
                        }
                    }
                    return users
                },
                { you: 'you' } as { [key: string]: string },
            ),
        )

        return names.length > 1
            ? names.reduce(
                  (k, c, index, arr) =>
                      k +
                      c +
                      (index === arr.length - 1 ? '' : index === arr.length - 2 ? ' and ' : ', '),
                  '',
              )
            : undefined
    }, [messages, profile?.userId])

    const messagesWithParent = useMemo(
        () => (parentMessage ? [parentMessage, ...messages] : []),
        [messages, parentMessage],
    )

    const { members } = useSpaceMembers()
    const channels = useSpaceChannels()

    const { isChannelWritable } = useIsChannelWritable(channelId)

    return parentMessage ? (
        <MessageTimelineWrapper
            events={messagesWithParent}
            spaceId={spaceId}
            channelId={channelId}
            threadParentId={parentId}
        >
            <Stack gap>
                <Box>
                    <Paragraph size="lg" color="default">
                        #{channelLabel.toLocaleLowerCase()}
                    </Paragraph>
                    {usernames && <Paragraph color="gray2">{usernames}</Paragraph>}
                </Box>
                <Stack scroll grow elevate rounded="sm" boxShadow="card">
                    <Stack>
                        <MessageTimeline collapsed />
                        <Box padding>
                            <RichTextEditor
                                editable={!!isChannelWritable}
                                threadId={parentId}
                                storageId={`${channelId.networkId}-${parentId}`}
                                autoFocus={false}
                                placeholder="Reply..."
                                channels={channels}
                                members={members}
                                onSend={onSend}
                            />
                        </Box>
                    </Stack>
                </Stack>
            </Stack>
        </MessageTimelineWrapper>
    ) : (
        <></>
    )
}
