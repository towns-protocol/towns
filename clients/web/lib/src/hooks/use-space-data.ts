import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Channel, SpaceData } from '../types/towns-types'
import { useTownsContext } from '../components/TownsContextProvider'
import { useSpaceContext } from '../components/SpaceContextProvider'
import {
    Client as CasablancaClient,
    Stream,
    isSpaceStreamId,
    Membership,
    toMembership,
} from '@towns-protocol/sdk'
import isEqual from 'lodash/isEqual'
import { useSpaceDapp } from './use-space-dapp'
import { ISpaceDapp, SpaceInfo } from '@towns-protocol/web3'
import { useQuery, useQueries, defaultStaleTime } from '../query/queryClient'
import { blockchainKeys } from '../query/query-keys'
import { isDefined } from '../utils/isDefined'
import { OfflineChannelMetadata, useOfflineStore } from '../store/use-offline-store'
import { TownsOpts } from 'client/TownsClientTypes'
import { create } from 'zustand'
import debounce from 'lodash/debounce'
// eslint-disable-next-line lodash/import-scope
import { DebouncedFunc } from 'lodash'
import { TProvider } from 'types/web3-types'
import { persist, createJSONStorage } from 'zustand/middleware'

const SPACE_DATA_STORE_NAME = 'towns/spaceDataStore'
const EMPTY_SPACE_INFOS: SpaceInfo[] = []

async function getChannelsMetadata(
    spaceDapp: ISpaceDapp,
    spaceId: string,
    channels: { channelId: string; updatedAtKey?: string }[],
): Promise<OfflineChannelMetadata[]> {
    // we can fetch all metatdata in one go, but first see if we have cached data at this version
    let metadata: OfflineChannelMetadata[] = []
    for (const { channelId, updatedAtKey } of channels) {
        const cached = useOfflineStore.getState().offlineChannelMetadataMap[channelId]
        if (cached && (!updatedAtKey || cached.updatedAtKey === updatedAtKey)) {
            metadata.push(cached)
        } else {
            break
        }
    }
    if (metadata.length === channels.length) {
        return metadata
    }
    metadata = []

    // fetch everything, push it to the cache
    const channelMetadata = await spaceDapp.getChannels(spaceId)
    // reduce the channels to a map of channelId to updatedAtKey
    const updatedAtKeys = channels.reduce((acc, c) => {
        acc[c.channelId] = c.updatedAtKey ?? '0'
        return acc
    }, {} as Record<string, string>)
    // save offline
    for (const channel of channelMetadata) {
        const offlineChannelMetadata = {
            channel,
            updatedAtKey: updatedAtKeys[channel.channelNetworkId] ?? '0',
        }
        useOfflineStore.getState().setOfflineChannelInfo(offlineChannelMetadata)
        metadata.push(offlineChannelMetadata)
    }
    // return the metadata
    return metadata
}

async function getSpaceInfo(
    spaceDapp: ISpaceDapp,
    spaceId: string,
): Promise<SpaceInfo | undefined> {
    // the offline store will get updated in useContractSpaceInfo
    const cachedSpaceInfo = useOfflineStore.getState().offlineSpaceInfoMap[spaceId]
    if (cachedSpaceInfo) {
        return cachedSpaceInfo
    }
    const spaceInfo = await spaceDapp.getSpaceInfo(spaceId)
    if (spaceInfo) {
        useOfflineStore.getState().setOfflineSpaceInfo(spaceInfo)
    }
    return spaceInfo
}

export type SpaceDataMap = Record<string, SpaceData | undefined>

export type SpaceDataStore = {
    spaceDataMap: SpaceDataMap | undefined
    setSpaceData: (spaceData: SpaceData) => void
}

export const useSpaceDataStore = create<SpaceDataStore>()(
    persist(
        (set) => ({
            spaceDataMap: undefined,
            setSpaceData: (spaceData) =>
                set((state) => {
                    if (!state.spaceDataMap) {
                        return {
                            spaceDataMap: {
                                [spaceData.id]: spaceData,
                            },
                        }
                    }
                    if (isEqual(state.spaceDataMap[spaceData.id], spaceData)) {
                        return state
                    }

                    // console.log(`setSpaceData<${spaceData.id}> data changed`, {
                    //     prevSpaceId: state.spaceDataMap[spaceData.id]?.id,
                    //     spaceData,
                    // })

                    return {
                        spaceDataMap: {
                            ...state.spaceDataMap,
                            [spaceData.id]: spaceData,
                        },
                    }
                }),
        }),
        {
            name: SPACE_DATA_STORE_NAME,
            storage: createJSONStorage(() => localStorage),
            version: 2,
        },
    ),
)

/// returns default space if no space slug is provided
export function useSpaceData(): SpaceData | undefined {
    const { spaceId: contextSpaceId } = useSpaceContext()
    return useSpaceDataWithId(contextSpaceId, 'useSpaceData')
}

export function useSpaceDataWithId(
    inSpaceId: string | undefined,
    _fromTag: string | undefined = undefined,
): SpaceData | undefined {
    const spaceData = useSpaceDataStore((state) =>
        inSpaceId ? state.spaceDataMap?.[inSpaceId] : undefined,
    )
    return spaceData
}

function spaceInfoWithChannelsQueryConfig({
    spaceId,
    spaceDapp,
    initialData,
    enabled = true,
}: {
    spaceId: string
    spaceDapp: ISpaceDapp | undefined
    initialData: SpaceInfo | undefined
    enabled?: boolean | undefined
}) {
    return {
        queryKey: blockchainKeys.spaceInfo(spaceId ?? ''),
        queryFn: async (
            spaceDapp: ISpaceDapp | undefined,
            client: CasablancaClient | undefined,
            spaceId: string | undefined,
        ): Promise<SpaceInfo | undefined> => {
            if (!spaceDapp || !spaceId || spaceId.length === 0 || !client) {
                return undefined
            }
            const spaceInfo: SpaceInfo | undefined = await spaceDapp.getSpaceInfo(spaceId)
            // console.log(`useContractSpaceInfo: ${spaceId}`, { spaceInfo })
            // if we don't have a spaceInfo from network for some reasons, return the cached one
            if (!spaceInfo) {
                return useOfflineStore.getState().offlineSpaceInfoMap[spaceId]
            }
            useOfflineStore.getState().setOfflineSpaceInfo(spaceInfo)
            return spaceInfo
        },
        options: {
            enabled: enabled && !!spaceId && !!spaceDapp,
            initialData,
            refetchOnMount: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            staleTime: defaultStaleTime,
        },
    }
}

export function useContractSpaceInfos(
    opts: TownsOpts,
    spaceIds: string[],
    client?: CasablancaClient,
) {
    const provider = opts.baseProvider
    const config = opts.baseConfig

    const spaceDapp = useSpaceDapp({
        config,
        provider,
    })
    const offlineSpaceInfoMap = useOfflineStore((s) => s.offlineSpaceInfoMap)

    const isEnabled = spaceDapp && client && client.streams.size() > 0

    const queryData = useQueries({
        queries: spaceIds.map((id) => {
            const queryConfig = spaceInfoWithChannelsQueryConfig({
                spaceId: id,
                spaceDapp,
                initialData: offlineSpaceInfoMap[id],
                enabled: isEnabled && !!id,
            })
            return {
                queryKey: queryConfig.queryKey,
                queryFn: () => {
                    // const res = queryConfig.queryFn(spaceDapp, client, id)
                    // console.log(`useContractSpaceInfos: ${id}`, { spaceInfo: res })
                    return queryConfig.queryFn(spaceDapp, client, id)
                },
                ...queryConfig.options,
                refetchOnMount: true,
            }
        }),
        combine: (results) => {
            return {
                data: results.map((r) => r.data).filter(isDefined),
                isLoading: results.some((r) => r.isLoading),
            }
        },
    })

    const spaceInfos = queryData.data.length > 0 ? queryData.data : EMPTY_SPACE_INFOS

    return useMemo(() => {
        return {
            data: spaceInfos,
            isLoading: queryData.isLoading,
        }
    }, [spaceInfos, queryData.isLoading])
}

export const useContractSpaceInfo = (
    spaceId: string | undefined,
): { data: SpaceInfo | undefined; isLoading: boolean; error: unknown } => {
    const offlineSpaceInfoMap = useOfflineStore((s) => s.offlineSpaceInfoMap)
    const { baseProvider: provider, baseConfig: config } = useTownsContext()
    const spaceDapp = useSpaceDapp({
        config,
        provider,
    })
    const { casablancaClient: client } = useTownsContext()

    const queryConfig = spaceInfoWithChannelsQueryConfig({
        spaceId: spaceId ?? '',
        spaceDapp,
        initialData: spaceId ? offlineSpaceInfoMap[spaceId] : undefined,
        enabled: !!spaceId && !!spaceDapp && !!client,
    })

    const {
        data: spaceInfo,
        isLoading,
        error,
    } = useQuery(
        queryConfig.queryKey,
        () => {
            const res = queryConfig.queryFn(spaceDapp, client, spaceId)
            // console.log(`useContractSpaceInfo: ${spaceId}`, { spaceInfo: res })
            return res
        },
        {
            ...queryConfig.options,
        },
    )

    return useMemo(() => {
        return { data: spaceInfo, isLoading: isLoading, error: error }
    }, [spaceInfo, isLoading, error])
}

/**
 * a hook to grab space data without any of the channels or side effects that require client
 * b/c it should use the same query key and return the same data in the query fn, it's typed to match useContractSpaceInfos
 * @param spaceId
 * @returns
 */
export function useContractSpaceInfoWithoutClient(spaceId: string | undefined) {
    const offlineSpaceInfoMap = useOfflineStore((s) => s.offlineSpaceInfoMap)

    const { baseProvider: provider, baseConfig: config } = useTownsContext()

    const spaceDapp = useSpaceDapp({
        config,
        provider,
    })

    const queryFn = useCallback(async (): ReturnType<
        ReturnType<typeof spaceInfoWithChannelsQueryConfig>['queryFn']
    > => {
        if (!spaceDapp || !spaceId || spaceId.length === 0) {
            return undefined
        }
        const spaceInfo: SpaceInfo | undefined = await spaceDapp.getSpaceInfo(spaceId)
        // console.log(`useContractSpaceInfo: ${spaceId}`, { spaceInfo })
        // if we don't have a spaceInfo from network for some reasons, return the cached one
        if (!spaceInfo) {
            return useOfflineStore.getState().offlineSpaceInfoMap[spaceId]
        }
        return spaceInfo
    }, [spaceDapp, spaceId])

    return useQuery(
        blockchainKeys.spaceInfo(spaceId ?? '') satisfies ReturnType<
            typeof spaceInfoWithChannelsQueryConfig
        >['queryKey'],
        queryFn,
        {
            initialData: spaceId ? offlineSpaceInfoMap[spaceId] : undefined,
            enabled: !!spaceId && !!spaceDapp,
            refetchOnMount: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            staleTime: defaultStaleTime,
        },
    )
}

export function useSpaceRollups(
    townsOpts: TownsOpts,
    casablancaClient: CasablancaClient | undefined,
    spaceDappProvider: TProvider,
) {
    const spaceDapp = useSpaceDapp({
        config: townsOpts.baseConfig,
        provider: spaceDappProvider,
    })
    const { setSpaceData } = useSpaceDataStore()
    const debounceRef = useRef<Record<string, DebouncedFunc<() => void>>>({})
    useEffect(() => {
        if (!casablancaClient || !spaceDapp) {
            return
        }
        const update = (spaceId: string) => {
            //console.log('!!UPDATE', spaceId)
            const userStreamId = casablancaClient.userStreamId
            if (!userStreamId) {
                // console.log('!!no user stream id')
                return
            }
            const userStream = casablancaClient.streams.get(userStreamId)
            if (!userStream || !userStream.view.isInitialized) {
                //console.log('!!no user stream')
                return
            }
            const stream = casablancaClient.streams.get(spaceId)
            if (!stream || !stream.view.isInitialized) {
                //console.log('!!no stream')
                return
            }
            void (async () => {
                const spaceChannels = mapSpaceChannels(stream)
                const channelMetadata = await getChannelsMetadata(spaceDapp, spaceId, spaceChannels)
                const spaceInfo = await getSpaceInfo(spaceDapp, spaceId)
                const spaceName: string = spaceInfo?.name ?? ''
                const membership = toMembership(
                    userStream.view.userContent.getMembership(stream.streamId)?.op,
                )
                const newSpace = rollupSpace(
                    stream,
                    membership,
                    spaceChannels,
                    channelMetadata.reduce((acc, c) => {
                        acc[c.channel.channelNetworkId] = c
                        return acc
                    }, {} as Record<string, OfflineChannelMetadata>),
                    spaceName,
                )
                if (newSpace) {
                    //console.log('!!setSpaceData', newSpace)
                    setSpaceData(newSpace)
                } else {
                    //console.log('!!no new space')
                }
            })()
        }

        const onStreamUpdated = (streamId: string) => {
            if (isSpaceStreamId(streamId)) {
                if (!debounceRef.current[streamId]) {
                    debounceRef.current[streamId] = debounce(() => update(streamId), 3000, {
                        maxWait: 3000,
                    }) // only do each space once every 3 seconds
                }
                debounceRef.current[streamId]!()
            }
        }

        // run the first update
        casablancaClient.streams.getStreamIds().forEach(onStreamUpdated)

        // listen to space events and user membership events to update the spaceData
        casablancaClient.on('streamInitialized', onStreamUpdated)
        casablancaClient.on('spaceChannelCreated', onStreamUpdated)
        casablancaClient.on('spaceChannelUpdated', onStreamUpdated)
        casablancaClient.on('spaceChannelAutojoinUpdated', onStreamUpdated)
        casablancaClient.on('spaceChannelHideUserJoinLeaveEventsUpdated', onStreamUpdated)
        casablancaClient.on('userStreamMembershipChanged', onStreamUpdated)

        return () => {
            // remove lsiteners and clear state when the effect stops
            casablancaClient.off('streamInitialized', onStreamUpdated)
            casablancaClient.off('spaceChannelCreated', onStreamUpdated)
            casablancaClient.off('spaceChannelUpdated', onStreamUpdated)
            casablancaClient.off('spaceChannelAutojoinUpdated', onStreamUpdated)
            casablancaClient.off('spaceChannelHideUserJoinLeaveEventsUpdated', onStreamUpdated)
            casablancaClient.off('userStreamMembershipChanged', onStreamUpdated)
        }
    }, [casablancaClient, setSpaceData, spaceDapp])
}

function rollupSpace(
    stream: Stream,
    membership: Membership,
    spaceChannels: { channelId: string; updatedAtKey: string }[],
    channelMetadata: Record<string, OfflineChannelMetadata>,
    spaceName?: string,
): SpaceData | undefined {
    if (stream.view.contentKind !== 'spaceContent') {
        throw new Error('stream is not a space')
    }

    const streamChannelMetadata = stream.view.spaceContent.spaceChannelsMetadata

    return {
        id: stream.view.streamId,
        name: spaceName ?? '',
        avatarSrc: '',
        channelGroups: [
            {
                label: 'Channels',
                channels: spaceChannels
                    .sort((a, b) => a.channelId.localeCompare(b.channelId))
                    .map(
                        (c) =>
                            ({
                                id: c.channelId,
                                label: channelMetadata[c.channelId]?.channel.name ?? c.channelId,
                                private: false,
                                highlight: false,
                                topic: channelMetadata[c.channelId]?.channel.description ?? '',
                                disabled: channelMetadata[c.channelId]?.channel.disabled ?? false,
                                isAutojoin:
                                    streamChannelMetadata.get(c.channelId)?.isAutojoin ?? false,
                                hideUserJoinLeaveEvents:
                                    streamChannelMetadata.get(c.channelId)
                                        ?.hideUserJoinLeaveEvents ?? false,
                                isDefault:
                                    streamChannelMetadata.get(c.channelId)?.isDefault ?? false,
                            } satisfies Channel),
                    ),
            },
        ],
        membership: membership,
        isLoadingChannels: false,
        hasLoadedMemberships: stream.view.isInitialized,
    }
}

const mapSpaceChannels = (stream?: Stream) => {
    const channelIds: string[] = stream
        ? Array.from(stream.view.spaceContent.spaceChannelsMetadata.keys())
        : []
    return channelIds.map((id) => {
        return {
            channelId: id,
            updatedAtKey:
                stream?.view.spaceContent.spaceChannelsMetadata
                    .get(id)
                    ?.updatedAtEventNum.toString() ?? '0',
        }
    })
}
