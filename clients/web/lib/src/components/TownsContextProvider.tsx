import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import { TownsClient } from '../client/TownsClient'
import { useContentAwareTimelineDiffCasablanca } from '../hooks/TownsContext/useContentAwareTimelineDiff'
import { useBlockedUsers } from '../hooks/use-blocked-users'
import { useSpacesIds } from '../hooks/TownsContext/useSpaceIds'
import { useSpaceUnreads } from '../hooks/TownsContext/useSpaceUnreads'
import { useSpaces } from '../hooks/TownsContext/useSpaces'
import { useCasablancaSpaceHierarchies } from '../hooks/TownsContext/useCasablancaSpaceHierarchies'
import { useTownsClientListener } from '../hooks/use-towns-client-listener'
import { Room, SpaceHierarchies, SpaceItem } from '../types/towns-types'
import { QueryProvider } from './QueryProvider'
import { Client as CasablancaClient, ClientInitStatus, SignerContext } from '@river/sdk'
import { useCasablancaTimelines } from '../hooks/TownsContext/useCasablancaTimelines'
import { useCasablancaRooms } from '../hooks/TownsContext/useCasablancaRooms'
import { useCasablancaDMs } from '../hooks/CasablancClient/useCasablancaDMs'
import { DMChannelIdentifier } from '../types/dm-channel-identifier'
import { useDMUnreads } from '../hooks/TownsContext/useDMUnreads'
import { useTimelineFilter } from '../store/use-timeline-filter'
import { ZTEvent } from '../types/timeline-types'
import { useClientInitStatus } from '../hooks/TownsContext/useClientInitStatus'
import { GlobalContextUserLookupProvider } from './UserLookupContextProviders'
import { TownsOpts } from '../client/TownsClientTypes'
import { Chain } from 'viem/chains'
import { IChainConfig, TProvider } from '../types/web3-types'
import { SnapshotCaseType } from '@river-build/proto'
import { makeProviderFromChain, makeProviderFromConfig } from '../utils/provider-utils'
import { BaseChainConfig, RiverChainConfig } from '@river-build/web3'
import { AccountAbstractionConfig } from '@towns/userops'

export type InitialSyncSortPredicate = (a: string, b: string) => number

export interface ITownsContext {
    environmentId: string /// the environment id, used to manage local storage keys
    signerContext?: SignerContext // context you will use to auth to the river stream node
    client?: TownsClient /// only set when user is authenticated
    clientSingleton?: TownsClient /// always set, can be use for , this duplication can be removed once we transition to casablanca
    casablancaClient?: CasablancaClient /// set if we're logged in and casablanca client is started
    baseConfig: BaseChainConfig
    baseChain: Chain
    baseProvider: TProvider
    riverConfig: RiverChainConfig
    riverChain: IChainConfig
    riverProvider: TProvider
    rooms: Record<string, Room | undefined>
    spaceUnreads: Record<string, boolean> // spaceId -> aggregated hasUnread
    spaceMentions: Record<string, number | undefined> // spaceId -> aggregated mentionCount
    spaceUnreadChannelIds: Record<string, Set<string> | undefined> // spaceId -> array of channelIds with unreads
    spaces: SpaceItem[]
    spaceHierarchies: SpaceHierarchies
    dmChannels: DMChannelIdentifier[]
    dmUnreadChannelIds: Set<string> // dmChannelId -> set of channelIds with unreads
    clientStatus: ClientInitStatus & { streamSyncActive: boolean }
    blockedUserIds: Set<string>
}

export const TownsContext = createContext<ITownsContext | undefined>(undefined)

/**
 * use instead of React.useContext, throws if not in a Provider
 */
export function useTownsContext(): ITownsContext {
    const context = useContext(TownsContext)
    if (!context) {
        throw new Error('useTownsContext must be used in a TownsContextProvider')
    }
    return context
}

interface TownsContextProviderProps {
    environmentId: string
    baseConfig: BaseChainConfig
    baseChain: Chain
    riverConfig: RiverChainConfig
    riverChain: IChainConfig
    enableSpaceRootUnreads?: boolean
    timelineFilter?: Set<ZTEvent>
    streamFilter?: Set<SnapshotCaseType>
    children: JSX.Element
    mutedChannelIds?: string[]
    QueryClientProvider?: React.ElementType<{ children: JSX.Element }>
    pushNotificationAuthToken?: string
    pushNotificationWorkerUrl?: string
    accountAbstractionConfig?: AccountAbstractionConfig
    highPriorityStreamIds?: string[]
}

export function TownsContextProvider({
    QueryClientProvider = QueryProvider,
    ...props
}: TownsContextProviderProps): JSX.Element {
    return (
        <QueryClientProvider>
            <TownsContextImplMemo {...props}></TownsContextImplMemo>
        </QueryClientProvider>
    )
}

const TownsContextImpl = (props: TownsContextProviderProps): JSX.Element => {
    let hookCounter = 0
    function useHookLogger() {
        useEffect(() => {
            console.log(`Hook number ${++hookCounter}`)
            return () => {
                hookCounter--
            }
        }, [])
    }

    const {
        environmentId,
        baseConfig,
        baseChain,
        riverConfig,
        riverChain,
        enableSpaceRootUnreads = false,
        timelineFilter,
        mutedChannelIds,
    } = props

    const previousProps = useRef<TownsContextProviderProps>()

    useEffect(() => {
        if (previousProps.current) {
            Object.keys(previousProps.current).forEach((key, i) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
                if ((previousProps.current as any)[key] !== (props as any)[key]) {
                    console.log('TownsContextImpl: props changed', i, key)
                }
            })
        }
    })

    previousProps.current = props

    const baseProvider = useMemo(() => {
        return makeProviderFromChain(baseChain)
    }, [baseChain])
    const riverProvider = useMemo(() => {
        return makeProviderFromConfig(riverChain)
    }, [riverChain])

    const townsOpts = useMemo(() => {
        return {
            environmentId,
            baseChainId: baseChain.id,
            baseConfig,
            baseProvider,
            riverChainId: riverChain.chainId,
            riverConfig,
            riverProvider,
            pushNotificationAuthToken: props.pushNotificationAuthToken,
            pushNotificationWorkerUrl: props.pushNotificationWorkerUrl,
            accountAbstractionConfig: props.accountAbstractionConfig,
            highPriorityStreamIds: props.highPriorityStreamIds,
        } satisfies TownsOpts
    }, [
        baseChain.id,
        baseConfig,
        baseProvider,
        environmentId,
        props.accountAbstractionConfig,
        props.highPriorityStreamIds,
        props.pushNotificationAuthToken,
        props.pushNotificationWorkerUrl,
        riverChain.chainId,
        riverConfig,
        riverProvider,
    ])

    const { client, clientSingleton, casablancaClient, signerContext } =
        useTownsClientListener(townsOpts)
    useSpacesIds(casablancaClient)
    useContentAwareTimelineDiffCasablanca(casablancaClient)
    const { clientStatus } = useClientInitStatus(casablancaClient)
    const { spaces } = useSpaces(townsOpts, casablancaClient)
    const { channels: dmChannels } = useCasablancaDMs(casablancaClient)
    const spaceHierarchies = useCasablancaSpaceHierarchies(casablancaClient)
    const blockedUserIds = useBlockedUsers(casablancaClient)

    const { spaceUnreads, spaceMentions, spaceUnreadChannelIds } = useSpaceUnreads({
        client,
        spaceHierarchies,
        enableSpaceRootUnreads,
        mutedChannelIds,
    })

    const { dmUnreadChannelIds } = useDMUnreads(casablancaClient, dmChannels)
    useHookLogger()

    const rooms = useCasablancaRooms(townsOpts, casablancaClient)
    const dynamicTimelineFilter = useTimelineFilter((state) => state.eventFilter)
    useCasablancaTimelines(
        casablancaClient,
        dynamicTimelineFilter ?? timelineFilter,
        props.streamFilter,
    )
    useHookLogger()

    return (
        <TownsContext.Provider
            value={{
                environmentId,
                client,
                clientSingleton,
                casablancaClient,
                baseConfig,
                baseChain,
                baseProvider,
                riverConfig,
                riverChain,
                riverProvider,
                rooms,
                spaceUnreads,
                spaceMentions,
                spaceUnreadChannelIds,
                spaces,
                spaceHierarchies,
                dmChannels,
                dmUnreadChannelIds,
                clientStatus,
                blockedUserIds,
                signerContext,
            }}
        >
            <GlobalContextUserLookupProvider>{props.children}</GlobalContextUserLookupProvider>
        </TownsContext.Provider>
    )
}

/// the towns client needs to be nested inside a Web3 provider, hence the need for this component
const TownsContextImplMemo = React.memo(
    TownsContextImpl,

    (
        prevProps: Readonly<TownsContextProviderProps>,
        nextProps: Readonly<TownsContextProviderProps>,
    ) => {
        let result = true
        Object.keys(prevProps).forEach((key, i) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
            if ((prevProps as any)[key] !== (nextProps as any)[key]) {
                console.log('TownsContextProvider: props changed', i, key)
                result = false
            }
        })
        return result
    },
)
