import React from 'react'
import { Outlet } from 'react-router'
import {
    Channel,
    ChannelContextProvider,
    useMatrixStore,
    useSpaceData,
    useSpaceId,
} from 'use-zion-client'
import { MessageThread } from '@components/MessageThread/MessageThread'
import { Stack } from '@ui'
import { useScanChannelThreads } from 'hooks/useFixMeMessageThread'

export const SpaceThreads = () => {
    const { userId } = useMatrixStore()
    const spaceId = useSpaceId()
    const data = useSpaceData()
    const channelGroups = data?.channelGroups ?? []

    // flatmap channels
    const channels = channelGroups.reduce((channels, group) => {
        return [...channels, ...group.channels]
    }, [] as Channel[])

    const { threads } = useScanChannelThreads(channels, userId)

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
