'use client'
import { createContext, useContext } from 'react'

type ChannelContextProps = {
    channelId: string | undefined
}
export const ChannelContext = createContext<ChannelContextProps | undefined>(undefined)

export const ChannelProvider = ({
    channelId,
    children,
}: {
    channelId: string | undefined
    children: React.ReactNode
}) => {
    return (
        <ChannelContext.Provider value={{ channelId }}>
            {channelId ? children : null}
        </ChannelContext.Provider>
    )
}

/**
 * Returns the current channelId, set by the <ChannelProvider /> component.
 */
export const useCurrentChannelId = () => {
    const channel = useContext(ChannelContext)
    if (!channel) {
        throw new Error('No channel set, use <ChannelProvider channelId={channelId} /> to set one')
    }
    if (!channel.channelId) {
        throw new Error('channelId is undefined, please check your <ChannelProvider /> usage')
    }

    return channel.channelId
}
