import { useEffect, useMemo, useState } from 'react'
import { InviteData, Membership, SpaceData, toMembership } from '../types/towns-types'
import { useTownsContext } from '../components/TownsContextProvider'
import { useSpaceContext } from '../components/SpaceContextProvider'
import { useCasablancaStream } from './CasablancClient/useCasablancaStream'
import { Client as CasablancaClient, Stream, isSpaceStreamId } from '@river/sdk'
import isEqual from 'lodash/isEqual'
import { useSpaceDapp } from './use-space-dapp'
import { ISpaceDapp, SpaceInfo } from '@river-build/web3'
import { useQuery, useQueries, defaultStaleTime } from '../query/queryClient'
import { blockchainKeys } from '../query/query-keys'
import { isDefined } from '../utils/isDefined'
import { useOfflineStore } from '../store/use-offline-store'
import { TownsOpts } from 'client/TownsClientTypes'
import { create } from 'zustand'

const EMPTY_SPACE_INFOS: SpaceInfo[] = []

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
        queryFn: async (spaceDapp: ISpaceDapp | undefined, spaceId: string | undefined) => {
            if (!spaceDapp || !spaceId || spaceId.length === 0) {
                return undefined
            }
            const spaceInfo: SpaceInfo | undefined = await spaceDapp.getSpaceInfo(spaceId)
            console.log(`useContractSpaceInfo: ${spaceId}`, { spaceInfo })
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
                    const res = queryConfig.queryFn(spaceDapp, id)
                    console.log(`useContractSpaceInfos: ${id}`, { spaceInfo: res })
                    return queryConfig.queryFn(spaceDapp, id)
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

    const queryConfig = spaceInfoQueryConfig({
        spaceId: spaceId ?? '',
        spaceDapp,
        initialData: spaceId ? offlineSpaceInfoMap[spaceId] : undefined,
        enabled: !!spaceId && !!spaceDapp,
    })

    const {
        data: spaceInfo,
        isLoading,
        error,
    } = useQuery(
        queryConfig.queryKey,
        () => {
            const res = queryConfig.queryFn(spaceDapp, spaceId)
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
            const channelIds = Array.from(stream.view.spaceContent.spaceChannelsMetadata.keys())
            const newSpace = rollupSpace(stream, membership, channelIds, spaceName)
            console.log(`useSpaceRollup ${fromTag}`, newSpace)
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
        casablancaClient.on('spaceChannelCreated', onStreamUpdated)
        casablancaClient.on('spaceChannelUpdated', onStreamUpdated)
        casablancaClient.on('userStreamMembershipChanged', onStreamUpdated)

        return () => {
            // remove lsiteners and clear state when the effect stops
            casablancaClient.off('streamInitialized', onStreamUpdated)
            casablancaClient.off('spaceChannelCreated', onStreamUpdated)
            casablancaClient.off('spaceChannelUpdated', onStreamUpdated)
            casablancaClient.off('userStreamMembershipChanged', onStreamUpdated)
        }
    }, [casablancaClient, fromTag, setSpaceData, spaceInfo?.name, stream, userStream])
}

function rollupSpace(
    stream: Stream,
    membership: Membership,
    channels: string[],
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
                channels: channels
                    .sort((a, b) => a.localeCompare(b))
                    .map((c) => ({
                        id: c,
                        label: stream.view.spaceContent.spaceChannelsMetadata.get(c)?.name ?? c,
                        private: false,
                        highlight: false,
                        topic: stream.view.spaceContent.spaceChannelsMetadata.get(c)?.topic ?? '',
                    })),
            },
        ],
        membership: membership,
        isLoadingChannels: false,
        hasLoadedMemberships: stream.view.isInitialized,
    }
}
