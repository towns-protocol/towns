import React from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { ChannelContextProvider } from 'use-towns-client'

export const Channels = () => {
    const { channelSlug } = useParams()
    if (!channelSlug) {
        return <>404 Channels route intended to be used with channel slug</>
    }
    return (
        <ChannelContextProvider channelId={channelSlug}>
            <Outlet />
        </ChannelContextProvider>
    )
}
