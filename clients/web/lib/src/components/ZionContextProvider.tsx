import React, { createContext, useContext, useEffect, useRef } from 'react'
import { ZionClient } from '../client/ZionClient'
import { useContentAwareTimelineDiffCasablanca } from '../hooks/ZionContext/useContentAwareTimelineDiff'
import { IOnboardingState } from '../hooks/ZionContext/onboarding/IOnboardingState'
import { useOnboardingState_Casablanca } from '../hooks/ZionContext/useOnboardingState'
import { useSpacesIds } from '../hooks/ZionContext/useSpaceIds'
import { useSpaceUnreads } from '../hooks/ZionContext/useSpaceUnreads'
import { useSpaces } from '../hooks/ZionContext/useSpaces'
import { useCasablancaSpaceHierarchies } from '../hooks/ZionContext/useCasablancaSpaceHierarchies'
import { useZionClientListener } from '../hooks/use-zion-client-listener'
import { Room, SpaceHierarchies, SpaceItem } from '../types/zion-types'
import { Web3ContextProvider } from './Web3ContextProvider'
import { QueryProvider } from './QueryProvider'
import { MatrixClient } from 'matrix-js-sdk'
import { Client as CasablancaClient } from '@river/sdk'
import { useCasablancaTimelines } from '../hooks/ZionContext/useCasablancaTimelines'
import { useCasablancaRooms } from '../hooks/ZionContext/useCasablancaRooms'
import { useCasablancaDMs } from '../hooks/CasablancClient/useCasablancaDMs'
import { DMChannelIdentifier } from '../types/dm-channel-identifier'
import { useDMUnreads } from '../hooks/ZionContext/useDMUnreads'
import { useTimelineFilter } from '../store/use-timeline-filter'
import { ZTEvent } from '../types/timeline-types'
import { useStreamSyncActive } from '../hooks/ZionContext/useStreamSyncActive'
import { GlobalContextUserLookupProvider } from './UserLookupContextProviders'
import { ZionOpts } from '../client/ZionClientTypes'

export type InitialSyncSortPredicate = (a: string, b: string) => number

export interface IZionContext {
    casablancaServerUrl?: ZionOpts['casablancaServerUrl']
    client?: ZionClient /// only set when user is authenticated with matrix or casablanca
    clientSingleton?: ZionClient /// always set, can be use for matrix, this duplication can be removed once we transition to casablanca
    matrixClient?: MatrixClient /// set if we're logged in and matrix client is started
    casablancaClient?: CasablancaClient /// set if we're logged in and casablanca client is started
    rooms: Record<string, Room | undefined>
    invitedToIds: string[] // ordered list of invites (spaces and channels)
    spaceUnreads: Record<string, boolean> // spaceId -> aggregated hasUnread
    spaceMentions: Record<string, number> // spaceId -> aggregated mentionCount
    spaceUnreadChannelIds: Record<string, string[]> // spaceId -> array of channelIds with unreads
    spaces: SpaceItem[]
    spaceHierarchies: SpaceHierarchies
    dmChannels: DMChannelIdentifier[]
    dmUnreadChannelIds: Set<string> // dmChannelId -> set of channelIds with unreads
    casablancaOnboardingState: IOnboardingState
    streamSyncActive: boolean
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

interface ZionContextProviderProps {
    chainId: number
    casablancaServerUrl?: string | undefined
    enableSpaceRootUnreads?: boolean
    timelineFilter?: Set<ZTEvent>
    children: JSX.Element
    initalSyncSortPredicate?: InitialSyncSortPredicate
    QueryClientProvider?: React.ElementType<{ children: JSX.Element }>
    pushNotificationAuthToken?: string
    pushNotificationWorkerUrl?: string
}

export function ZionContextProvider({
    QueryClientProvider = QueryProvider,
    ...props
}: ZionContextProviderProps): JSX.Element {
    return (
        <QueryClientProvider>
            <Web3ContextProvider chainId={props.chainId}>
                <ZionContextImplMemo {...props}></ZionContextImplMemo>
            </Web3ContextProvider>
        </QueryClientProvider>
    )
}

const ZionContextImpl = (props: ZionContextProviderProps): JSX.Element => {
    let hookCounter = 0

    function useHookLogger() {
        useEffect(() => {
            console.log(`Hook number ${++hookCounter}`)
            return () => {
                hookCounter--
            }
        }, [])
    }

    const { casablancaServerUrl, enableSpaceRootUnreads, timelineFilter } = props

    const previousProps = useRef<ZionContextProviderProps>()

    useEffect(() => {
        if (previousProps.current) {
            Object.keys(previousProps.current).forEach((key, i) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
                if ((previousProps.current as any)[key] !== (props as any)[key]) {
                    console.log('ZionContextImpl: props changed', i, key)
                }
            })
        }
    })

    previousProps.current = props

    const { client, clientSingleton, casablancaClient } = useZionClientListener({
        chainId: props.chainId,
        casablancaServerUrl: props.casablancaServerUrl,
        pushNotificationAuthToken: props.pushNotificationAuthToken,
        pushNotificationWorkerUrl: props.pushNotificationWorkerUrl,
    })
    const { invitedToIds } = useSpacesIds(casablancaClient)
    useContentAwareTimelineDiffCasablanca(casablancaClient)
    const { streamSyncActive } = useStreamSyncActive(casablancaClient)
    const { spaces } = useSpaces(undefined, casablancaClient)
    const { channels: dmChannels } = useCasablancaDMs(casablancaClient)
    const spaceHierarchies = useCasablancaSpaceHierarchies(casablancaClient)
    const { spaceUnreads, spaceMentions, spaceUnreadChannelIds } = useSpaceUnreads(
        client,
        spaceHierarchies,
        enableSpaceRootUnreads === true,
    )

    const { dmUnreadChannelIds } = useDMUnreads(casablancaClient, dmChannels)
    useHookLogger()

    const rooms = useCasablancaRooms(casablancaClient)
    const dynamicTimelineFilter = useTimelineFilter((state) => state.eventFilter)
    useCasablancaTimelines(casablancaClient, dynamicTimelineFilter ?? timelineFilter)
    const casablancaOnboardingState = useOnboardingState_Casablanca(client, casablancaClient)
    useHookLogger()

    return (
        <ZionContext.Provider
            value={{
                client,
                clientSingleton,
                casablancaClient,
                rooms,
                invitedToIds,
                spaceUnreads,
                spaceMentions,
                spaceUnreadChannelIds,
                spaces,
                spaceHierarchies,
                dmChannels,
                dmUnreadChannelIds,
                casablancaOnboardingState,
                casablancaServerUrl: casablancaServerUrl,
                streamSyncActive,
            }}
        >
            <GlobalContextUserLookupProvider>{props.children}</GlobalContextUserLookupProvider>
        </ZionContext.Provider>
    )
}

/// the zion client needs to be nested inside a Web3 provider, hence the need for this component
const ZionContextImplMemo = React.memo(
    ZionContextImpl,

    (
        prevProps: Readonly<ZionContextProviderProps>,
        nextProps: Readonly<ZionContextProviderProps>,
    ) => {
        let result = true
        Object.keys(prevProps).forEach((key, i) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
            if ((prevProps as any)[key] !== (nextProps as any)[key]) {
                console.log('ZionContextProvider: props changed', i, key)
                result = false
            }
        })
        return result
    },
)
