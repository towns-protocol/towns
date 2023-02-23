import React, { createContext, useContext, useMemo } from 'react'
import { ZionClient } from '../client/ZionClient'
import { ZionOpts } from '../client/ZionClientTypes'
import { useContentAwareTimelineDiff } from '../hooks/ZionContext/useContentAwareTimelineDiff'
import { IOnboardingState } from '../hooks/ZionContext/onboarding/IOnboardingState'
import { useOnboardingState } from '../hooks/ZionContext/useOnboardingState'
import { useSpacesIds } from '../hooks/ZionContext/useSpaceIds'
import { useSpaceUnreads } from '../hooks/ZionContext/useSpaceUnreads'
import { useSpaces } from '../hooks/ZionContext/useSpaces'
import { useSyncErrorHandler } from '../hooks/ZionContext/useSyncErrorHandler'
import { useSyncSpaceHierarchies } from '../hooks/ZionContext/useSyncSpaceHierarchies'
import { useFavIconBadge } from '../hooks/ZionContext/useFavIconBadge'
import { useMatrixRooms } from '../hooks/ZionContext/useMatrixRooms'
import { useMatrixTimelines } from '../hooks/ZionContext/useMatrixTimelines'
import { useZionClientListener } from '../hooks/use-zion-client-listener'
import { Room, SpaceHierarchies, SpaceItem } from '../types/zion-types'
import { makeRoomIdentifier, RoomIdentifier } from '../types/room-identifier'
import { Web3ContextProvider } from './Web3ContextProvider'
import { Chain } from 'wagmi'
import { useTransactionListener } from '../hooks/use-transaction-listener'
import { QueryProvider } from './QueryProvider'

export interface IZionContext {
    client?: ZionClient /// only set when user is authenticated with matrix
    clientSingleton?: ZionClient /// always set, can be use for matrix, this duplication can be removed once we transition to casablanca
    rooms: Record<string, Room | undefined>
    invitedToIds: RoomIdentifier[] // ordered list of invites (spaces and channels)
    spaceUnreads: Record<string, boolean> // spaceId -> aggregated hasUnread
    spaceMentions: Record<string, number> // spaceId -> aggregated mentionCount
    spaces: SpaceItem[]
    spaceHierarchies: SpaceHierarchies
    onboardingState: IOnboardingState
    homeServerUrl: string
    defaultSpaceId?: RoomIdentifier
    defaultSpaceName?: string
    defaultSpaceAvatarSrc?: string
    syncError?: string
}

export const ZionContext = createContext<IZionContext | undefined>(undefined)

/**
 * use instead of React.useContext, throws if not in a Provider
 */
export function useZionContext(): IZionContext {
    const context = useContext(ZionContext)
    if (!context) {
        throw new Error('useZionContext must be used in a ZionContextProvider')
    }
    return context
}

interface Props extends ZionOpts {
    enableSpaceRootUnreads?: boolean
    defaultSpaceId?: string
    defaultSpaceName?: string // name is temporary until peek() is implemented https://github.com/HereNotThere/harmony/issues/188
    defaultSpaceAvatarSrc?: string // avatar is temporary until peek() is implemented https://github.com/HereNotThere/harmony/issues/188
    chain?: Chain
    children: JSX.Element
    alchemyKey?: string
    QueryClientProvider?: React.ElementType<{ children: JSX.Element }>
}

export function ZionContextProvider({
    QueryClientProvider = QueryProvider,
    ...props
}: Props): JSX.Element {
    const { alchemyKey, chain, ...contextProps } = props
    return (
        <QueryClientProvider>
            <Web3ContextProvider alchemyKey={alchemyKey} chain={chain}>
                <ContextImpl {...contextProps}></ContextImpl>
            </Web3ContextProvider>
        </QueryClientProvider>
    )
}

/// the zion client needs to be nested inside a Web3 provider, hence the need for this component
const ContextImpl = (props: Props): JSX.Element => {
    const {
        matrixServerUrl,
        enableSpaceRootUnreads,
        defaultSpaceId,
        defaultSpaceName,
        defaultSpaceAvatarSrc,
    } = props

    const { client, clientSingleton } = useZionClientListener(props)
    const { invitedToIds } = useSpacesIds(client)
    useContentAwareTimelineDiff(client?.matrixClient)
    const { spaces } = useSpaces(client)
    const { spaceHierarchies } = useSyncSpaceHierarchies(client, invitedToIds)
    const { spaceUnreads, spaceMentions } = useSpaceUnreads(
        client,
        spaceHierarchies,
        enableSpaceRootUnreads === true,
    )

    const convertedDefaultSpaceId = useMemo(
        () => (defaultSpaceId ? makeRoomIdentifier(defaultSpaceId) : undefined),
        [defaultSpaceId],
    )

    const rooms = useMatrixRooms(client?.matrixClient)
    useMatrixTimelines(client?.matrixClient)
    const onboardingState = useOnboardingState(client)
    const syncError = useSyncErrorHandler(matrixServerUrl, client)

    useFavIconBadge(invitedToIds, spaceUnreads, spaceMentions)

    useTransactionListener(client, matrixServerUrl)

    return (
        <ZionContext.Provider
            value={{
                client,
                clientSingleton,
                rooms,
                invitedToIds,
                spaceUnreads,
                spaceMentions,
                spaces,
                spaceHierarchies,
                onboardingState,
                homeServerUrl: matrixServerUrl,
                defaultSpaceId: convertedDefaultSpaceId,
                defaultSpaceName,
                defaultSpaceAvatarSrc,
                syncError,
            }}
        >
            {props.children}
        </ZionContext.Provider>
    )
}
