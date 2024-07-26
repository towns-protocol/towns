'use client'

import { createContext, useContext } from 'react'

type SpaceContextProps = {
    spaceId: string | undefined
}
const SpaceContext = createContext<SpaceContextProps | undefined>(undefined)

export const SpaceProvider = ({
    spaceId,
    children,
}: {
    spaceId: string | undefined
    children: React.ReactNode
}) => {
    return (
        <SpaceContext.Provider value={{ spaceId }}>
            {spaceId ? children : null}
        </SpaceContext.Provider>
    )
}

/**
 * Returns the current spaceId, set by the <ChannelProvider /> component.
 */
export const useCurrentSpaceId = () => {
    const space = useContext(SpaceContext)
    if (!space) {
        throw new Error('No space set, use <SpaceProvider spaceId={spaceId} /> to set one')
    }
    if (!space.spaceId) {
        throw new Error('spaceId is undefined, please check your <SpaceProvider /> usage')
    }

    return space.spaceId
}
