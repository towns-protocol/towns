import { useEffect, useMemo, useState } from 'react'
import { Channel, InviteData, Membership, SpaceData, toMembership } from '../types/towns-types'
import { useTownsContext } from '../components/TownsContextProvider'
import { useSpaceContext } from '../components/SpaceContextProvider'
import { useCasablancaStream } from './CasablancClient/useCasablancaStream'
import { Client as CasablancaClient, Stream, isSpaceStreamId } from '@river/sdk'
import isEqual from 'lodash/isEqual'
import { useSpaceDapp } from './use-space-dapp'
import { ChannelMetadata, ISpaceDapp, SpaceInfo } from '@river-build/web3'
import { useQuery, useQueries, defaultStaleTime } from '../query/queryClient'
import { blockchainKeys } from '../query/query-keys'
import { isDefined } from '../utils/isDefined'
import { OfflineChannelMetadata, useOfflineStore } from '../store/use-offline-store'
import { TownsOpts } from 'client/TownsClientTypes'
import { create } from 'zustand'

const EMPTY_SPACE_INFOS: SpaceInfo[] = []
const EMPTY_CHANNEL_METADATA: OfflineChannelMetadata[] = []

export type SpaceDataMap = Record<string, SpaceData | undefined>

export type SpaceDataStore = {
    spaceDataMap: SpaceDataMap | undefined
    setSpaceData: (spaceData: SpaceData) => void
}

export const useSpaceDataStore = create<SpaceDataStore>((set) => ({
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
            console.log(`setSpaceData<${spaceData.id}> data changed`, { spaceData })
            return {
                spaceDataMap: {
                    ...state.spaceDataMap,
                    [spaceData.id]: spaceData,
                },
            }
        }),
}))

/// returns default space if no space slug is provided
export function useSpaceData(): SpaceData | undefined {
    const { spaceId: contextSpaceId } = useSpaceContext()
    return useSpaceDataWithId(contextSpaceId, 'useSpaceData')
}

export function useSpaceDataWithId(
    inSpaceId: string | undefined,
    fromTag: string | undefined = undefined,
): SpaceData | undefined {
    useSpaceRollup(inSpaceId, `useSpaceDataWithId<${fromTag}>`)
    const spaceData = useSpaceDataStore((state) => state.spaceDataMap)?.[inSpaceId ?? '']
    return spaceData
}

export function useInvites(): InviteData[] {
    return []
}

export const useInviteData = (slug: string | undefined) => {
    const invites = useInvites()
    return useMemo(
        () =>
            invites.find((invite) => {
                return invite.id === slug || invite.id === encodeURIComponent(slug || '')
            }),
        [invites, slug],
    )
}

function channelInfoQueryConfig({
    spaceId,
    channelId,
    updatedAtHash,
    spaceDapp,
    initialData,
    enabled = true,
}: {
    spaceId: string
    channelId: string
    updatedAtHash: string
    spaceDapp: ISpaceDapp | undefined
    initialData: OfflineChannelMetadata | undefined
    enabled?: boolean | undefined
}) {
    const needsUpdate =
        enabled && !!spaceId && !!spaceDapp && initialData?.updatedAtHash !== updatedAtHash // we fetch these in the space query, only fetch if not defined
    return {
        queryKey: blockchainKeys.channelInfo(channelId ?? '', updatedAtHash ?? ''),
        queryFn: async (
            spaceDapp: ISpaceDapp | undefined,
            spaceId: string | undefined,
            channelId: string | undefined,
            updatedAtHash: string | undefined,
        ) => {
            if (
                !spaceDapp ||
                !spaceId ||
                spaceId.length === 0 ||
                !channelId ||
                channelId.length === 0 ||
                !updatedAtHash ||
                updatedAtHash.length === 0
            ) {
                return undefined
            }
            const space = spaceDapp.getSpace(spaceId)
            // if we don't have a spaceInfo from network for some reasons, return the cached one
            if (!space) {
                return useOfflineStore.getState().offlineChannelMetadataMap[channelId]
            }
            const channel = await space.getChannelMetadata(channelId)

            console.log(
                `channelInfoQueryConfig spaceDapp.getChannelMetadata: ${spaceId}/${channelId} at: ${updatedAtHash}`,
                { channel },
            )
            if (channel) {
                useOfflineStore
                    .getState()
                    .setOfflineChannelInfo({ channel, updatedAtHash: updatedAtHash })
            }
            return { channel, updatedAtHash }
        },
        options: {
            enabled: needsUpdate,
            initialData: needsUpdate ? undefined : initialData, // if our initial data is out of date we want to fetch imediately
            refetchOnMount: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            staleTime: Infinity, // once fetched this data is good for ever
            gcTime: Infinity, // once fetched this data is good for ever
        },
    }
}

function spaceInfoQueryConfig({
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
        ) => {
            if (!spaceDapp || !spaceId || spaceId.length === 0 || !client) {
                return undefined
            }
            const spaceInfo: SpaceInfo | undefined = await spaceDapp.getSpaceInfo(spaceId)
            console.log(`useContractSpaceInfo: ${spaceId}`, { spaceInfo })
            // if we don't have a spaceInfo from network for some reasons, return the cached one
            if (!spaceInfo) {
                return useOfflineStore.getState().offlineSpaceInfoMap[spaceId]
            }
            const now = Date.now()
            const channelData = client.streams.get(spaceId)?.view.spaceContent.spaceChannelsMetadata
            const channels = await spaceDapp.getChannels(spaceId)
            channels.forEach((channel: ChannelMetadata) => {
                const hash = channelData?.get(channel.channelNetworkId)?.updatedAtHash ?? `${now}`
                useOfflineStore.getState().setOfflineChannelInfo({
                    channel,
                    updatedAtHash: hash,
                })
            })
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

export function useChannelMetadata(
    spaceId: string | undefined,
    channels: { id: string; updatedAtHash: string }[],
) {
    const { baseProvider: provider, baseConfig: config, client } = useTownsContext()
    const spaceDapp = useSpaceDapp({ config, provider })
    const offlineChannelInfoMap = useOfflineStore((s) => s.offlineChannelMetadataMap)

    //console.log('offline channels', offlineChannelInfoMap)
    const isEnabled = spaceDapp && channels.length > 0 && !!client

    const queryData = useQueries({
        queries: spaceId
            ? channels.map((channel) => {
                  const queryConfig = channelInfoQueryConfig({
                      spaceId: spaceId,
                      channelId: channel.id,
                      updatedAtHash: channel.updatedAtHash,
                      spaceDapp,
                      initialData: offlineChannelInfoMap[channel.id],
                      enabled: isEnabled,
                  })
                  return {
                      queryKey: queryConfig.queryKey,
                      queryFn: () => {
                          const res = queryConfig.queryFn(
                              spaceDapp,
                              spaceId,
                              channel.id,
                              channel.updatedAtHash,
                          )
                          console.log(
                              `useChannelMetadata query: ${spaceId}/${channel.id} at: ${channel.updatedAtHash}`,
                          )
                          return res
                      },
                      ...queryConfig.options,
                      refetchOnMount: false,
                  }
              })
            : [],
        combine: (results) => {
            return {
                data: results.map((r) => r.data).filter(isDefined),
                isLoading: results.some((r) => r.isLoading),
            }
        },
    })

    const channelMetaData = queryData.data.length > 0 ? queryData.data : EMPTY_CHANNEL_METADATA
    return useMemo(() => {
        return channelMetaData.reduce((acc, cur) => {
            if (!!cur && !!cur.channel && !!cur.channel.channelNetworkId) {
                acc[cur.channel.channelNetworkId] = {
                    channel: cur.channel,
                    updatedAtHash: cur.updatedAtHash,
                }
            }
            return acc
        }, {} as Record<string, OfflineChannelMetadata>)
    }, [channelMetaData])
}

export function useContractSpaceInfos(opts: TownsOpts, client?: CasablancaClient) {
    const provider = opts.baseProvider
    const config = opts.baseConfig

    const spaceDapp = useSpaceDapp({
        config,
        provider,
    })
    const offlineSpaceInfoMap = useOfflineStore((s) => s.offlineSpaceInfoMap)

    const isEnabled = spaceDapp && client && client.streams.size() > 0

    const [spaceIds, setSpaceIds] = useState<string[]>([])
    useEffect(() => {
        if (!isEnabled || !client) {
            return
        }

        const updateSpaceIds = () => {
            const newSpaceIds = client.streams.getStreamIds().filter((id) => isSpaceStreamId(id))
            setSpaceIds((prev) => {
                if (isEqual(prev, newSpaceIds)) {
                    return prev
                }
                return newSpaceIds
            })
        }

        const streamUpdated = (streamId: string) => {
            if (isSpaceStreamId(streamId)) {
                updateSpaceIds()
            }
        }
        updateSpaceIds()

        client.on('streamInitialized', streamUpdated)
        client.on('userLeftStream', streamUpdated)
        return () => {
            client.off('streamInitialized', streamUpdated)
            client.off('userLeftStream', streamUpdated)
        }
    }, [isEnabled, client, setSpaceIds])

    const queryData = useQueries({
        queries: spaceIds.map((id) => {
            const queryConfig = spaceInfoQueryConfig({
                spaceId: id,
                spaceDapp,
                initialData: offlineSpaceInfoMap[id],
                enabled: isEnabled && !!id,
            })
            return {
                queryKey: queryConfig.queryKey,
                queryFn: () => {
                    const res = queryConfig.queryFn(spaceDapp, client, id)
                    console.log(`useContractSpaceInfos: ${id}`, { spaceInfo: res })
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

    const queryConfig = spaceInfoQueryConfig({
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
            console.log(`useContractSpaceInfo: ${spaceId}`, { spaceInfo: res })
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

export function useSpaceRollup(streamId: string | undefined, fromTag: string | undefined) {
    const { casablancaClient } = useTownsContext()
    const stream = useCasablancaStream(streamId)
    const { data: spaceInfo } = useContractSpaceInfo(streamId ?? '')
    const userStream = useCasablancaStream(casablancaClient?.userStreamId)
    const { setSpaceData } = useSpaceDataStore()

    const [spaceChannels, setSpaceChannels] = useState<{ id: string; updatedAtHash: string }[]>(
        mapSpaceChannels(stream),
    )
    const channelMetadata = useChannelMetadata(streamId, spaceChannels)

    useEffect(() => {
        if (!stream || !casablancaClient || stream.view.contentKind !== 'spaceContent') {
            return
        }
        const update = () => {
            const spaceChannels = mapSpaceChannels(stream)
            setSpaceChannels((prev) => {
                if (isEqual(prev, spaceChannels)) {
                    return prev
                }
                return spaceChannels
            })
        }

        const onStreamUpdated = (streamId: string) => {
            if (streamId === stream.streamId) {
                update()
            }
        }

        // run the first update
        update()

        // listen to space events and user membership events to update the spaceData
        casablancaClient.on('streamInitialized', onStreamUpdated)
        casablancaClient.on('spaceChannelCreated', onStreamUpdated)
        casablancaClient.on('spaceChannelUpdated', onStreamUpdated)

        return () => {
            // remove lsiteners and clear state when the effect stops
            casablancaClient.off('streamInitialized', onStreamUpdated)
            casablancaClient.off('spaceChannelCreated', onStreamUpdated)
            casablancaClient.off('spaceChannelUpdated', onStreamUpdated)
        }
    }, [casablancaClient, stream])

    useEffect(() => {
        if (!stream || !casablancaClient || !userStream) {
            return
        }
        if (stream.view.contentKind !== 'spaceContent') {
            console.error('useSpaceRollup called with non-space stream')
            return
        }

        // wrap the update op, we get the channel ids and
        // rollup the space channels into a space
        const update = () => {
            const spaceName: string = spaceInfo?.name ?? ''
            const membership = toMembership(
                userStream.view.userContent.getMembership(stream.streamId)?.op,
            )
            const newSpace = rollupSpace(
                stream,
                membership,
                spaceChannels,
                channelMetadata,
                spaceName,
            )
            if (newSpace && newSpace.id === stream.streamId) {
                setSpaceData(newSpace)
            }
        }

        const onStreamUpdated = (streamId: string) => {
            if (streamId === stream.streamId || streamId === userStream.streamId) {
                update()
            }
        }

        // run the first update
        update()

        // this hook produces a list of channel metadata and the current user's membership
        // listen to space events and user membership events to update the spaceData
        casablancaClient.on('streamInitialized', onStreamUpdated)
        casablancaClient.on('userStreamMembershipChanged', onStreamUpdated)

        return () => {
            // remove lsiteners and clear state when the effect stops
            casablancaClient.off('streamInitialized', onStreamUpdated)
            casablancaClient.off('userStreamMembershipChanged', onStreamUpdated)
        }
    }, [
        casablancaClient,
        spaceChannels,
        channelMetadata,
        fromTag,
        setSpaceData,
        spaceInfo?.name,
        stream,
        userStream,
    ])
}

function rollupSpace(
    stream: Stream,
    membership: Membership,
    spaceChannels: { id: string; updatedAtHash: string }[],
    channelMetadata: Record<string, OfflineChannelMetadata>,
    spaceName?: string,
): SpaceData | undefined {
    if (stream.view.contentKind !== 'spaceContent') {
        throw new Error('stream is not a space')
    }

    return {
        id: stream.view.streamId,
        name: spaceName ?? '',
        avatarSrc: '',
        channelGroups: [
            {
                label: 'Channels',
                channels: spaceChannels
                    .sort((a, b) => a.id.localeCompare(b.id))
                    .map(
                        (c) =>
                            ({
                                id: c.id,
                                label: channelMetadata[c.id]?.channel.name ?? c.id,
                                private: false,
                                highlight: false,
                                topic: '',
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
            id,
            updatedAtHash:
                stream?.view.spaceContent.spaceChannelsMetadata.get(id)?.updatedAtHash ?? '',
        }
    })
}
