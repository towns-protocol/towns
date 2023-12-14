import React, { createContext, useContext, useMemo } from 'react'
import { RoomIdentifier, toRoomIdentifier } from '../types/room-identifier'
import { SpaceContextUserLookupProvider } from './UserLookupContext'

export interface ISpaceContext {
    spaceId?: RoomIdentifier
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const SpaceContext = createContext<ISpaceContext | undefined>(undefined)

/**
 * use instead of React.useContext, throws if not in a Provider
 */
export function useSpaceContext(): ISpaceContext {
    const spaceContext = useContext<ISpaceContext | undefined>(SpaceContext)
    if (!spaceContext) {
        throw new Error('useSpaceContext must be used in a SpaceContextProvider')
    }
    return spaceContext
}

interface Props {
    spaceId: RoomIdentifier | string | undefined
    children: JSX.Element
}

export function SpaceContextProvider(props: Props): JSX.Element {
    // in a very safe way, memoize all space context parameters
    const spaceId = useMemo(
        () => (props.spaceId ? toRoomIdentifier(props.spaceId) : undefined),
        [props.spaceId],
    )
    const spaceContext: ISpaceContext = useMemo(
        () => ({
            spaceId: spaceId,
        }),
        [spaceId],
    )

    return (
        <SpaceContext.Provider value={spaceContext}>
            <SpaceContextUserLookupProvider>{props.children}</SpaceContextUserLookupProvider>
        </SpaceContext.Provider>
    )
}
