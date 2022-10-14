import { Outlet, useParams } from 'react-router'
import { ChannelContextProvider, useSpaceData } from 'use-zion-client'
import React from 'react'

export const SpaceThreadInboxChannel = () => {
    const { channelId } = useParams()
    const spaceData = useSpaceData()
    const channel = spaceData?.channelGroups
        .flatMap((cg) => cg.channels)
        .find((c) => c.id.matrixRoomId === channelId)

    if (!channel) {
        throw new Error(`channel with id ${channelId} isn't accessible`)
    }

    return (
        <ChannelContextProvider channelId={channel.id}>
            <Outlet />
        </ChannelContextProvider>
    )
}
