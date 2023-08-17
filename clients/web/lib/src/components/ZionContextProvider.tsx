import React, { createContext, useContext } from 'react'
import { ZionClient } from '../client/ZionClient'
import { SpaceProtocol, ZionOpts } from '../client/ZionClientTypes'
import {
    useContentAwareTimelineDiff,
    useContentAwareTimelineDiffCasablanca,
} from '../hooks/ZionContext/useContentAwareTimelineDiff'
import { IOnboardingState } from '../hooks/ZionContext/onboarding/IOnboardingState'
import {
    useOnboardingState_Casablanca,
    useOnboardingState_Matrix,
} from '../hooks/ZionContext/useOnboardingState'
import { useSpacesIds } from '../hooks/ZionContext/useSpaceIds'
import { useSpaceUnreads } from '../hooks/ZionContext/useSpaceUnreads'
import { useSpaces } from '../hooks/ZionContext/useSpaces'
import { useSyncErrorHandler } from '../hooks/ZionContext/useSyncErrorHandler'
import { useCasablancaSpaceHierarchies } from '../hooks/ZionContext/useCasablancaSpaceHierarchies'
import {
    useSyncSpaceHierarchies,
    InitialSyncSortPredicate,
} from '../hooks/ZionContext/useSyncSpaceHierarchies'
import { useMatrixRooms } from '../hooks/ZionContext/useMatrixRooms'
import { useMatrixTimelines } from '../hooks/ZionContext/useMatrixTimelines'
import { useZionClientListener } from '../hooks/use-zion-client-listener'
import { Room, SpaceHierarchies, SpaceItem } from '../types/zion-types'
import { RoomIdentifier } from '../types/room-identifier'
import { Web3ContextProvider } from './Web3ContextProvider'
import { useTransactionListener } from '../hooks/use-transaction-listener'
import { QueryProvider } from './QueryProvider'
import { MatrixClient } from 'matrix-js-sdk'
import { Client as CasablancaClient } from '@river/sdk'
import { useCasablancaTimelines } from '../hooks/ZionContext/useCasablancaTimelines'
import { useCasablancaRooms } from '../hooks/ZionContext/useCasablancaRooms'
import { ethers } from 'ethers'
import merge from 'lodash/merge'
import { useLoggedInWalletAddress } from '../hooks/use-logged-in-wallet-address'
import { Connectors } from '../types/web3-types'

export interface IZionContext {
    homeServerUrl: string
    casablancaServerUrl?: string
    appChainId: number /// our app is locked to a single chain that matches the server deployment
    client?: ZionClient /// only set when user is authenticated with matrix or casablanca
    clientSingleton?: ZionClient /// always set, can be use for matrix, this duplication can be removed once we transition to casablanca
    matrixClient?: MatrixClient /// set if we're logged in and matrix client is started
    casablancaClient?: CasablancaClient /// set if we're logged in and casablanca client is started
    primaryProtocol: SpaceProtocol
    rooms: Record<string, Room | undefined>
    invitedToIds: RoomIdentifier[] // ordered list of invites (spaces and channels)
    spaceUnreads: Record<string, boolean> // spaceId -> aggregated hasUnread
    spaceMentions: Record<string, number> // spaceId -> aggregated mentionCount
    spaceUnreadChannelIds: Record<string, string[]> // spaceId -> array of channelIds with unreads
    spaces: SpaceItem[]
    spaceHierarchies: SpaceHierarchies
    syncSpaceHierarchy: (spaceId: string) => void // function to force sync the space hierarchy
    matrixOnboardingState: IOnboardingState
    casablancaOnboardingState: IOnboardingState
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
    children: JSX.Element
    alchemyKey?: string
    connectors?: Connectors // optional connectors to use instead of default injected connector
    web3Signer?: ethers.Signer
    initalSyncSortPredicate?: InitialSyncSortPredicate
    timeBetweenSyncingSpaces?: number
    QueryClientProvider?: React.ElementType<{ children: JSX.Element }>
}

export function ZionContextProvider({
    QueryClientProvider = QueryProvider,
    ...props
}: Props): JSX.Element {
    const { alchemyKey, web3Signer, connectors, ...contextProps } = props
    return (
        <QueryClientProvider>
            <Web3ContextProvider
                alchemyKey={alchemyKey}
                connectors={connectors}
                chainId={contextProps.chainId}
                web3Signer={web3Signer}
            >
                <ContextImpl {...contextProps}></ContextImpl>
            </Web3ContextProvider>
        </QueryClientProvider>
    )
}

/// the zion client needs to be nested inside a Web3 provider, hence the need for this component
const ContextImpl = (props: Props): JSX.Element => {
    const {
        casablancaServerUrl,
        matrixServerUrl,
        enableSpaceRootUnreads,
        primaryProtocol,
        initalSyncSortPredicate,
        timeBetweenSyncingSpaces,
    } = props

    const { client, clientSingleton, matrixClient, casablancaClient } = useZionClientListener(props)
    const { invitedToIds } = useSpacesIds(matrixClient, casablancaClient)
    useContentAwareTimelineDiff(matrixClient)
    useContentAwareTimelineDiffCasablanca(casablancaClient)
    const { spaces } = useSpaces(matrixClient, casablancaClient)
    const loggedInWalletAddress = useLoggedInWalletAddress({
        matrixServerUrl,
        casablancaServerUrl,
        primaryProtocol,
    })

    const { matrixSpaceHierarchies, syncSpaceHierarchy } = useSyncSpaceHierarchies(
        client,
        matrixClient,
        invitedToIds,
        loggedInWalletAddress,
        initalSyncSortPredicate,
        timeBetweenSyncingSpaces,
    )
    const casablancaSpaceHierarchies = useCasablancaSpaceHierarchies(casablancaClient)
    const spaceHierarchies = merge(matrixSpaceHierarchies, casablancaSpaceHierarchies)
    const { spaceUnreads, spaceMentions, spaceUnreadChannelIds } = useSpaceUnreads(
        client,
        spaceHierarchies,
        enableSpaceRootUnreads === true,
    )

    const matrixRooms = useMatrixRooms(matrixClient)
    const casablancaRooms = useCasablancaRooms(casablancaClient)
    const rooms: Record<string, Room | undefined> = {
        ...matrixRooms,
        ...casablancaRooms,
    }

    useMatrixTimelines(matrixClient)
    useCasablancaTimelines(casablancaClient)
    const matrixOnboardingState = useOnboardingState_Matrix(client, matrixClient)
    const casablancaOnboardingState = useOnboardingState_Casablanca(client, casablancaClient)
    const syncError = useSyncErrorHandler(matrixServerUrl, client, matrixClient)

    useTransactionListener(client, matrixServerUrl, casablancaServerUrl)

    return (
        <ZionContext.Provider
            value={{
                client,
                clientSingleton,
                appChainId: props.chainId,
                primaryProtocol,
                matrixClient,
                casablancaClient,
                rooms,
                invitedToIds,
                spaceUnreads,
                spaceMentions,
                spaceUnreadChannelIds,
                spaces,
                spaceHierarchies,
                matrixOnboardingState,
                casablancaOnboardingState,
                homeServerUrl: matrixServerUrl,
                casablancaServerUrl: casablancaServerUrl,
                syncError,
                syncSpaceHierarchy,
            }}
        >
            {props.children}
        </ZionContext.Provider>
    )
}
