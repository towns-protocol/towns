import React, { createContext, useContext } from 'react'
import { ZionClient } from '../client/ZionClient'
import { ZionOpts } from '../client/ZionClientTypes'
import { useContentAwareTimelineDiffCasablanca } from '../hooks/ZionContext/useContentAwareTimelineDiff'
import { IOnboardingState } from '../hooks/ZionContext/onboarding/IOnboardingState'
import {
    useOnboardingState_Casablanca,
    useOnboardingState_Matrix,
} from '../hooks/ZionContext/useOnboardingState'
import { useSpacesIds } from '../hooks/ZionContext/useSpaceIds'
import { useSpaceUnreads } from '../hooks/ZionContext/useSpaceUnreads'
import { useSpaces } from '../hooks/ZionContext/useSpaces'
import { useCasablancaSpaceHierarchies } from '../hooks/ZionContext/useCasablancaSpaceHierarchies'
import { useMatrixRooms } from '../hooks/ZionContext/useMatrixRooms'
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

export type InitialSyncSortPredicate = (a: RoomIdentifier, b: RoomIdentifier) => number

export interface IZionContext {
    casablancaServerUrl?: string
    appChainId: number /// our app is locked to a single chain that matches the server deployment
    client?: ZionClient /// only set when user is authenticated with matrix or casablanca
    clientSingleton?: ZionClient /// always set, can be use for matrix, this duplication can be removed once we transition to casablanca
    matrixClient?: MatrixClient /// set if we're logged in and matrix client is started
    casablancaClient?: CasablancaClient /// set if we're logged in and casablanca client is started
    rooms: Record<string, Room | undefined>
    invitedToIds: RoomIdentifier[] // ordered list of invites (spaces and channels)
    spaceUnreads: Record<string, boolean> // spaceId -> aggregated hasUnread
    spaceMentions: Record<string, number> // spaceId -> aggregated mentionCount
    spaceUnreadChannelIds: Record<string, string[]> // spaceId -> array of channelIds with unreads
    spaces: SpaceItem[]
    spaceHierarchies: SpaceHierarchies
    matrixOnboardingState: IOnboardingState
    casablancaOnboardingState: IOnboardingState
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
    web3Signer?: ethers.Signer
    initalSyncSortPredicate?: InitialSyncSortPredicate
    QueryClientProvider?: React.ElementType<{ children: JSX.Element }>
}

export function ZionContextProvider({
    QueryClientProvider = QueryProvider,
    ...props
}: Props): JSX.Element {
    const { web3Signer, ...contextProps } = props
    return (
        <QueryClientProvider>
            <Web3ContextProvider chainId={contextProps.chainId} web3Signer={web3Signer}>
                <ContextImpl {...contextProps}></ContextImpl>
            </Web3ContextProvider>
        </QueryClientProvider>
    )
}

/// the zion client needs to be nested inside a Web3 provider, hence the need for this component
const ContextImpl = (props: Props): JSX.Element => {
    const { casablancaServerUrl, enableSpaceRootUnreads } = props

    const { client, clientSingleton, casablancaClient } = useZionClientListener(props)
    const { invitedToIds } = useSpacesIds(casablancaClient)
    useContentAwareTimelineDiffCasablanca(casablancaClient)
    const { spaces } = useSpaces(undefined, casablancaClient)

    const spaceHierarchies = useCasablancaSpaceHierarchies(casablancaClient)
    const { spaceUnreads, spaceMentions, spaceUnreadChannelIds } = useSpaceUnreads(
        client,
        spaceHierarchies,
        enableSpaceRootUnreads === true,
    )

    const matrixRooms = useMatrixRooms(undefined)
    const casablancaRooms = useCasablancaRooms(casablancaClient)
    const rooms: Record<string, Room | undefined> = {
        ...matrixRooms,
        ...casablancaRooms,
    }

    useCasablancaTimelines(casablancaClient)
    const matrixOnboardingState = useOnboardingState_Matrix(client, undefined)
    const casablancaOnboardingState = useOnboardingState_Casablanca(client, casablancaClient)

    useTransactionListener(client, casablancaServerUrl)

    return (
        <ZionContext.Provider
            value={{
                client,
                clientSingleton,
                appChainId: props.chainId,
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
                casablancaServerUrl: casablancaServerUrl,
            }}
        >
            {props.children}
        </ZionContext.Provider>
    )
}
