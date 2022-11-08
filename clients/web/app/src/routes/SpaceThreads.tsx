import React from 'react'
import { Outlet } from 'react-router'
import {
    ChannelContextProvider,
    useMatrixStore,
    useSpaceId,
    useSpaceThreadRoots,
} from 'use-zion-client'
import { MessageThread } from '@components/MessageThread/MessageThread'
import { Stack } from '@ui'

export const SpaceThreads = () => {
    const { userId } = useMatrixStore()
    const spaceId = useSpaceId()
    const threads = useSpaceThreadRoots()

    return userId && spaceId ? (
        <Stack grow horizontal>
            <Stack grow background="level2">
                {threads.map(({ thread, channel }) => {
                    return (
                        <ChannelContextProvider key={thread.parentId} channelId={channel.id}>
                            <MessageThread
                                userId={userId}
                                parentId={thread.parentId}
                                channelId={channel.id}
                                channelLabel={channel.label}
                                spaceId={spaceId}
                            />
                        </ChannelContextProvider>
                    )
                })}
            </Stack>
            <Outlet />
        </Stack>
    ) : (
        <></>
    )
}
