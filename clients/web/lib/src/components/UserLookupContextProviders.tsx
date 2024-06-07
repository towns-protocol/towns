import React, { useMemo } from 'react'
import { UserLookupContext } from './UserLookupContext'
import { useSpaceContext } from './SpaceContextProvider'

type DMChannelContextUserLookupProviderProps = {
    channelId: string
    children: React.ReactNode
}

export const DMChannelContextUserLookupProvider: React.FC<
    DMChannelContextUserLookupProviderProps
> = ({ channelId, children }) => {
    const { spaceId } = useSpaceContext()

    const contextValue = useMemo(
        () => ({
            spaceId,
            channelId,
        }),
        [spaceId, channelId],
    )

    return <UserLookupContext.Provider value={contextValue}>{children}</UserLookupContext.Provider>
}
