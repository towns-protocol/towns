import React, { createContext, useContext, useMemo } from 'react'
import { useSpaceId } from '../hooks/use-space-id'

export interface IChannelContext {
    channelId: string
    spaceId: string | undefined
}

export const ChannelContext = createContext<IChannelContext | undefined>(undefined)

/**
 * use instead of React.useContext, throws if not in a Provider
 */
export function useChannelContext(): IChannelContext {
    const context = useContext(ChannelContext)
    if (!context) {
        throw new Error('useChannelContext must be used in a ChannelContextProvider')
    }
    return context
}

interface Props {
    channelId: string
    children: JSX.Element
}

export function ChannelContextProvider(props: Props): JSX.Element {
    const { channelId } = props
    const spaceId = useSpaceId()

    const channelContext: IChannelContext = useMemo(
        () => ({
            channelId: channelId,
            spaceId: spaceId,
        }),
        [channelId, spaceId],
    )
    return (
        <ChannelContext.Provider value={channelContext}>{props.children}</ChannelContext.Provider>
    )
}
