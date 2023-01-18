import React from 'react'
import { Outlet } from 'react-router'
import { firstBy } from 'thenby'
import {
    ChannelContextProvider,
    ThreadResult,
    useMatrixCredentials,
    useSpaceId,
    useSpaceThreadRoots,
} from 'use-zion-client'
import { usePersistOrder } from 'hooks/usePersistOrder'
import { Stack } from '@ui'
import { MessageThread } from '@components/MessageThread/MessageThread'

function sortThreads(threads: ThreadResult[]) {
    return threads.sort(
        firstBy<ThreadResult>((m) => (m.isUnread ? 0 : 1)).thenBy((a) => a.timestamp, -1),
    )
}

export const SpaceThreads = () => {
    const { userId } = useMatrixCredentials()
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
