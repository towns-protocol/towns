import React from 'react'
import { Outlet } from 'react-router'
import {
    ChannelContextProvider,
    ThreadResult,
    useMatrixStore,
    useSpaceId,
    useSpaceThreadRoots,
} from 'use-zion-client'
import { MessageThread } from '@components/MessageThread/MessageThread'
import { Stack } from '@ui'
import { usePersistOrder } from 'hooks/usePersistOrder'
import { sortThreads } from './SpaceThreadInbox'

export const SpaceThreads = () => {
    const { userId } = useMatrixStore()
    const spaceId = useSpaceId()
    const threadRoots = useSpaceThreadRoots()

    const threads = usePersistOrder(threadRoots, {
        sorterFn: sortThreads,
        identityFn: (t: ThreadResult) => t.thread.parentId,
    })

    return userId && spaceId ? (
        <Stack grow horizontal>
            <Stack grow background="level1">
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
