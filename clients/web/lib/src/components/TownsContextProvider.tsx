import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import { TownsClient } from '../client/TownsClient'
import { useContentAwareTimelineDiffCasablanca } from '../hooks/TownsContext/useContentAwareTimelineDiff'
import { useBlockedUsers } from '../hooks/use-blocked-users'
import { useSpacesIds } from '../hooks/TownsContext/useSpaceIds'
import { useSpaceUnreads } from '../hooks/TownsContext/useSpaceUnreads'
import { useSpaces } from '../hooks/TownsContext/useSpaces'
import { useTownsClientListener } from '../hooks/use-towns-client-listener'
import { Room, SpaceItem } from '../types/towns-types'
import { QueryProvider } from './QueryProvider'
import {
    Client as CasablancaClient,
    RiverTimelineEvent,
    SignerContext,
    UnpackEnvelopeOpts,
} from '@towns-protocol/sdk'
import { useCasablancaTimelines } from '../hooks/TownsContext/useCasablancaTimelines'
import { useCasablancaRooms } from '../hooks/TownsContext/useCasablancaRooms'
import { useCasablancaDMs } from '../hooks/CasablancClient/useCasablancaDMs'
import { DMChannelIdentifier } from '../types/dm-channel-identifier'
import { useDMUnreads } from '../hooks/TownsContext/useDMUnreads'
import { useClientInitStatus } from '../hooks/TownsContext/useClientInitStatus'
import { TownsOpts } from '../client/TownsClientTypes'
import { Chain } from 'viem/chains'
import { IChainConfig, TProvider } from '../types/web3-types'
import { makeProviderFromChain, makeProviderFromConfig } from '../utils/provider-utils'
import { BaseChainConfig, RiverChainConfig, XchainConfig } from '@towns-protocol/web3'
import { AccountAbstractionConfig } from '@towns/userops'
import { useUserLookupUpdater } from '../hooks/use-user-lookup-updater'
import { TownsAnalytics } from '../types/TownsAnalytics'
import { useStreamMetadataUpdater } from '../hooks/use-stream-metadata-updater'
import { NotificationSettingsClient } from '../client/TownsNotifciationSettings'
import { useSpaceRollups } from '../hooks/use-space-data'
import { useCalculateSpaceThreadRoots } from '../hooks/use-space-thread-roots'
import { useCalculateSpaceMentions } from '../hooks/use-space-mentions'
import { dlogger } from '@towns-protocol/dlog'
import { getXchainConfig } from '../client/XChainConfig'

export type InitialSyncSortPredicate = (a: string, b: string) => number

const log = dlogger('towns:context')

export interface ITownsContext {
    environmentId: string /// the environment id, used to manage local storage keys
    signerContext?: SignerContext // context you will use to auth to the river stream node
    notificationSettingsClient?: NotificationSettingsClient
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
    spaceIds: string[]
    dmChannels: DMChannelIdentifier[]
    dmUnreadChannelIds: Set<string> // dmChannelId -> set of channelIds with unreads
    clientStatus: ReturnType<typeof useClientInitStatus>
    blockedUserIds: Set<string>
    xchainConfig: XchainConfig
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
    timelineFilter?: Set<RiverTimelineEvent>
    children: JSX.Element
    QueryClientProvider?: React.ElementType<{ children: JSX.Element }>
    riverNotificationServiceUrl?: string
    accountAbstractionConfig?: AccountAbstractionConfig
    highPriorityStreamIds?: string[]
    unpackEnvelopeOpts?: UnpackEnvelopeOpts
    supportedXChainRpcMapping?: {
        [chainId: number]: string
    }
    ethMainnetRpcUrl?: string
    analytics?: TownsAnalytics
    createLegacySpaces?: boolean
    streamMetadataUrl?: string
    useModifySync?: boolean
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
    const {
        environmentId,
        baseConfig,
        baseChain,
        riverConfig,
        riverChain,
        timelineFilter,
        streamMetadataUrl,
    } = props

    const previousProps = useRef<TownsContextProviderProps>()

    useEffect(() => {
        if (previousProps.current) {
            Object.keys(previousProps.current).forEach((key, i) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
                if ((previousProps.current as any)[key] !== (props as any)[key]) {
                    log.info('prop changed', i, key)
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

    const xchainConfig = useMemo(() => {
        return getXchainConfig(baseChain.id, props.supportedXChainRpcMapping ?? {})
    }, [baseChain.id, props.supportedXChainRpcMapping])

    const townsOpts = useMemo(() => {
        return {
            environmentId,
            baseChainId: baseChain.id,
            baseConfig,
            baseProvider,
            riverChainId: riverChain.chainId,
            riverConfig,
            riverProvider,
            xchainConfig,
            accountAbstractionConfig: props.accountAbstractionConfig,
            highPriorityStreamIds: props.highPriorityStreamIds,
            unpackEnvelopeOpts: props.unpackEnvelopeOpts,
            ethMainnetRpcUrl: props.ethMainnetRpcUrl,
            analytics: props.analytics,
            createLegacySpaces: props.createLegacySpaces,
            useModifySync: props.useModifySync,
        } satisfies TownsOpts
    }, [
        environmentId,
        baseChain.id,
        baseConfig,
        baseProvider,
        riverChain.chainId,
        riverConfig,
        riverProvider,
        xchainConfig,
        props.accountAbstractionConfig,
        props.highPriorityStreamIds,
        props.unpackEnvelopeOpts,
        props.ethMainnetRpcUrl,
        props.analytics,
        props.createLegacySpaces,
        props.useModifySync,
    ])

    const { client, clientSingleton, casablancaClient, signerContext } =
        useTownsClientListener(townsOpts)
    const notificationSettingsClient = useNotificationSettingsClient(
        signerContext,
        environmentId,
        props.riverNotificationServiceUrl,
    )
    const spaceIds = useSpacesIds(casablancaClient)
    useContentAwareTimelineDiffCasablanca(casablancaClient)
    const clientStatus = useClientInitStatus(casablancaClient)

    const { spaces } = useSpaces(townsOpts, spaceIds, casablancaClient)
    const { channels: dmChannels } = useCasablancaDMs(casablancaClient)
    const blockedUserIds = useBlockedUsers(casablancaClient)
    useUserLookupUpdater(townsOpts, casablancaClient, client)
    useStreamMetadataUpdater(casablancaClient, client, streamMetadataUrl)
    useCalculateSpaceThreadRoots(townsOpts)
    useCalculateSpaceMentions(townsOpts)

    const { spaceUnreads, spaceMentions, spaceUnreadChannelIds } = useSpaceUnreads(
        client,
        notificationSettingsClient,
    )

    const { dmUnreadChannelIds } = useDMUnreads(casablancaClient, dmChannels)

    const rooms = useCasablancaRooms(townsOpts, casablancaClient)

    useCasablancaTimelines(casablancaClient, timelineFilter)
    useSpaceRollups(townsOpts, casablancaClient, baseProvider)

    const value = useMemo(() => {
        const newValue = {
            environmentId,
            client,
            clientSingleton,
            casablancaClient,
            notificationSettingsClient,
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
            spaceIds,
            dmChannels,
            dmUnreadChannelIds,
            clientStatus,
            blockedUserIds,
            signerContext,
            xchainConfig,
        } satisfies ITownsContext

        return newValue
    }, [
        environmentId,
        client,
        clientSingleton,
        casablancaClient,
        notificationSettingsClient,
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
        spaceIds,
        dmChannels,
        dmUnreadChannelIds,
        clientStatus,
        blockedUserIds,
        signerContext,
        xchainConfig,
    ])

    const valueRef = useRef<ITownsContext>()

    useEffect(() => {
        //log.info('context impl changed', !!value)
        if (valueRef.current) {
            // const diffKeys = Object.keys(valueRef.current).reduce((acc, key) => {
            //     // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
            //     if ((valueRef.current as any)[key] !== (value as any)[key]) {
            //         acc.push(key)
            //     }
            //     return acc
            // }, [] as string[])
            // log.info('new values', diffKeys)
        }
        valueRef.current = value
    }, [value])

    return <TownsContext.Provider value={value}>{props.children}</TownsContext.Provider>
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
                log.info('context impl props changed', i, key)
                result = false
            }
        })
        return result
    },
)

// private singleton, not exported, to use the notification settings client get it from useTownsContext()
function useNotificationSettingsClient(
    signerContext: SignerContext | undefined,
    environmentId: string,
    url: string | undefined,
): NotificationSettingsClient | undefined {
    return useMemo(() => {
        if (!signerContext) {
            return undefined
        }
        return new NotificationSettingsClient(signerContext, environmentId, url)
    }, [environmentId, signerContext, url])
}
