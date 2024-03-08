import React, { useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
    ChannelContextProvider,
    useChannelId,
    useChannelThread,
    useMyMembership,
    useSpaceData,
    useTownsClient,
} from 'use-towns-client'
import { ChatMessages } from '@components/ChatMessages'

export function Thread(): JSX.Element {
    const space = useSpaceData()
    const { channelSlug, threadParentId } = useParams()

    if (!channelSlug) {
        return <>channelSlug not defined</>
    }
    if (!threadParentId) {
        return <>threadParentId not defined</>
    }

    return (
        <ChannelContextProvider channelId={channelSlug}>
            <>
                <div>
                    Thread for {space?.name}, {channelSlug}, {threadParentId}
                </div>
                <ThreadContent threadParentId={threadParentId} />
            </>
        </ChannelContextProvider>
    )
}

function ThreadContent(props: { threadParentId: string }): JSX.Element {
    const { threadParentId } = props
    const { sendMessage } = useTownsClient()
    const channelId = useChannelId()
    const membership = useMyMembership(channelId)
    const { messages, parent } = useChannelThread(threadParentId)
    const parentMessage = parent?.parentEvent
    const timeline = useMemo(() => {
        return parentMessage ? [parentMessage, ...messages] : messages
    }, [messages, parentMessage])

    const onClickSendMessage = useCallback(
        (roomId: string, message: string) => {
            return sendMessage(roomId, message, { threadId: threadParentId })
        },
        [sendMessage, threadParentId],
    )

    const onClickJoinRoom = useCallback((roomId: string) => {
        throw new Error('join room from thread not implemented')
    }, [])

    return (
        <ChatMessages
            roomId={channelId}
            threadParentId={threadParentId}
            timeline={timeline}
            membership={membership}
            sendMessage={onClickSendMessage}
            joinRoom={onClickJoinRoom}
        />
    )
}
