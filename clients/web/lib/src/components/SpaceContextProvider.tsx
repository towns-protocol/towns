import React, { createContext, useContext, useMemo } from 'react'
import { UserLookupContext } from './UserLookupContext'

export interface ISpaceContext {
    spaceId?: string
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const SpaceContext = createContext<ISpaceContext | undefined>(undefined)

/**
 * use instead of React.useContext, throws if not in a Provider
 */
export function useSpaceContext(): ISpaceContext {
    const spaceContext = useContext<ISpaceContext | undefined>(SpaceContext)
    return useMemo(() => spaceContext ?? {}, [spaceContext])
}

interface Props {
    spaceId: string | undefined
    children: JSX.Element
}

export function SpaceContextProvider(props: Props): JSX.Element {
    const { spaceId, children } = props
    return (
        <SpaceContext.Provider value={{ spaceId }}>
            <UserLookupContext.Provider value={{ spaceId }}>{children}</UserLookupContext.Provider>
        </SpaceContext.Provider>
    )
}
