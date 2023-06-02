import React, { useMemo } from 'react'
import {
    RoomIdentifier,
    SendMessageOptions,
    ZTEvent,
    useMyProfile,
    useSpaceMembers,
    useTimelineThread,
} from 'use-zion-client'
import { firstBy } from 'thenby'
import { MessageTimeline } from '@components/MessageTimeline/MessageTimeline'
import { MessageTimelineWrapper } from '@components/MessageTimeline/MessageTimelineContext'
import { RichTextEditor } from '@components/RichText/RichTextEditor'
import { Box, Paragraph, Stack } from '@ui'
import { useIsChannelWritable } from 'hooks/useIsChannelWritable'
import { useSendReply } from 'hooks/useSendReply'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { FadeInBox } from '@components/Transitions'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { useAuth } from 'hooks/useAuth'

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

    const { sendReply } = useSendReply(parentId, parentMessage?.fallbackContent)

    const onSend = (value: string, options: SendMessageOptions | undefined) => {
        sendReply(value, channelId, options)
    }

    const profile = useMyProfile()

    const messagesWithParent = useMemo(
        () => (parentMessage ? [parentMessage, ...messages] : []),
        [messages, parentMessage],
    )

    const involvedUsers = useMemo(() => {
        return Object.values(
            messagesWithParent.reduce((users, m) => {
                if (m.content?.kind === ZTEvent.RoomMessage && m.sender?.id) {
                    users[m.sender.id] = {
                        userId: m.sender.id,
                        displayName: m.sender.displayName,
                    }
                }
                return users
            }, {} as { [key: string]: { userId: string; displayName: string } }),
        )
    }, [messagesWithParent])

    const usernames = useMemo(() => {
        const names = Object.values(involvedUsers)
            .map((u) => {
                const isYou = u.userId === profile?.userId
                const displayName = isYou ? 'you' : getPrettyDisplayName(u).name
                return displayName
            })
            .sort(firstBy((n) => n === 'you'))
        return names.length > 0
            ? names.reduce(
                  (k, c, index, arr) =>
                      k +
                      c +
                      (index === arr.length - 1 ? '' : index === arr.length - 2 ? ' and ' : ', '),
                  '',
              )
            : undefined
    }, [involvedUsers, profile?.userId])

    const { members } = useSpaceMembers()
    const userId = useMyProfile()?.userId
    const { loggedInWalletAddress } = useAuth()
    const channels = useSpaceChannels()

    const { isChannelWritable } = useIsChannelWritable(spaceId, channelId, loggedInWalletAddress)

    return parentMessage && involvedUsers.length > 1 ? (
        <MessageTimelineWrapper
            events={messagesWithParent}
            spaceId={spaceId}
            channelId={channelId}
            threadParentId={parentId}
        >
            <FadeInBox gap>
                <Box>
                    <Paragraph size="lg" color="default">
                        #{channelLabel.toLocaleLowerCase()}
                    </Paragraph>
                    {usernames && <Paragraph color="gray2">{usernames}</Paragraph>}
                </Box>
                <Stack scroll grow elevate rounded="sm" boxShadow="panel">
                    <Stack>
                        <MessageTimeline collapsed />
                        <Box padding>
                            <RichTextEditor
                                editable={!!isChannelWritable}
                                threadId={parentId}
                                threadPreview={parentMessage?.fallbackContent}
                                storageId={`${channelId.networkId}-${parentId}`}
                                autoFocus={false}
                                placeholder="Reply..."
                                channels={channels}
                                members={members}
                                userId={userId}
                                onSend={onSend}
                            />
                        </Box>
                    </Stack>
                </Stack>
            </FadeInBox>
        </MessageTimelineWrapper>
    ) : (
        <></>
    )
}
