import React, { createContext, useContext, useMemo } from 'react'
import { ethers } from 'ethers'
import { ZionClient } from '../client/ZionClient'
import { ZionOnboardingOpts, SpaceProtocol } from '../client/ZionClientTypes'
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
import { Room, SpaceHierarchies, SpaceItem } from '../types/matrix-types'
import { makeRoomIdentifier, RoomIdentifier } from '../types/room-identifier'
import { Web3ContextProvider } from './Web3ContextProvider'

export interface IZionContext {
    client?: ZionClient
    rooms: Record<string, Room | undefined>
    invitedToIds: RoomIdentifier[] // ordered list of invites (spaces and channels)
    spaceIds: RoomIdentifier[] // ordered list of space ids
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

interface Props {
    primaryProtocol: SpaceProtocol
    homeServerUrl: string
    casablancaServerUrl: string
    onboardingOpts?: ZionOnboardingOpts
    enableSpaceRootUnreads?: boolean
    signer?: ethers.Signer // only used for testing, when the signer is a local in memory wallet
    defaultSpaceId?: string
    defaultSpaceName?: string // name is temporary until peek() is implemented https://github.com/HereNotThere/harmony/issues/188
    defaultSpaceAvatarSrc?: string // avatar is temporary until peek() is implemented https://github.com/HereNotThere/harmony/issues/188
    initialSyncLimit?: number
    chainId?: number
    children: JSX.Element
    alchemyKey?: string
}

const DEFAULT_INITIAL_SYNC_LIMIT = 20

export function ZionContextProvider(props: Props): JSX.Element {
    const { alchemyKey, ...contextProps } = props
    return (
        <Web3ContextProvider alchemyKey={alchemyKey}>
            <ContextImpl {...contextProps}></ContextImpl>
        </Web3ContextProvider>
    )
}

/// the zion client needs to be nested inside a Web3 provider, hence the need for this component
const ContextImpl = (props: Props): JSX.Element => {
    const {
        primaryProtocol,
        homeServerUrl,
        casablancaServerUrl,
        onboardingOpts,
        enableSpaceRootUnreads,
        signer,
        defaultSpaceId,
        defaultSpaceName,
        defaultSpaceAvatarSrc,
        initialSyncLimit,
        chainId,
    } = props

    const { client } = useZionClientListener(
        primaryProtocol,
        homeServerUrl,
        casablancaServerUrl,
        initialSyncLimit ?? DEFAULT_INITIAL_SYNC_LIMIT,
        onboardingOpts,
        signer,
        chainId,
    )
    useContentAwareTimelineDiff(client?.matrixClient)
    const { spaceIds, invitedToIds } = useSpacesIds(client)
    const { spaces } = useSpaces(client, spaceIds)
    const { spaceHierarchies } = useSyncSpaceHierarchies(client, spaceIds, invitedToIds)
    const { spaceUnreads, spaceMentions } = useSpaceUnreads(
        client,
        spaceIds,
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
    const syncError = useSyncErrorHandler(homeServerUrl, client)

    useFavIconBadge(invitedToIds, spaceUnreads, spaceMentions)

    return (
        <ZionContext.Provider
            value={{
                client,
                rooms,
                invitedToIds,
                spaceIds,
                spaceUnreads,
                spaceMentions,
                spaces,
                spaceHierarchies,
                onboardingState,
                homeServerUrl,
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
