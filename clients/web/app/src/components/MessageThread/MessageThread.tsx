import React, { useMemo } from 'react'
import {
    RoomIdentifier,
    SendMessageOptions,
    ZTEvent,
    useMyProfile,
    useTimelineThread,
} from 'use-zion-client'
import { MessageTimeline } from '@components/MessageTimeline/MessageTimeline'
import { MessageTimelineWrapper } from '@components/MessageTimeline/MessageTimelineContext'
import { RichTextEditor } from '@components/RichText/RichTextEditor'
import { Box, Paragraph, Stack } from '@ui'
import { useSendReply } from 'hooks/useSendReply'

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
                        const sender = m.content.sender
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

    return parentMessage ? (
        <MessageTimelineWrapper
            events={[parentMessage, ...messages]}
            spaceId={spaceId}
            channelId={channelId}
            threadParentId={parentId}
        >
            <Stack gap padding>
                <Box>
                    <Paragraph size="lg" color="default">
                        #{channelLabel.toLocaleLowerCase()}
                    </Paragraph>
                    {usernames && <Paragraph color="gray2">{usernames}</Paragraph>}
                </Box>
                <Stack scroll grow border rounded="sm" background="level2" boxShadow="card">
                    {/* {parentMessage && parentMessageContent && (
                        <TimelineMessage
                            event={parentMessage}
                            eventContent={parentMessageContent}
                        />
                    )} */}
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
    ) : (
        <></>
    )
}
