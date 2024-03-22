import { useCallback, useEffect, useMemo, useState } from 'react'
import { InviteData, Membership, SpaceData, toMembership } from '../types/towns-types'
import { useTownsContext } from '../components/TownsContextProvider'
import { useSpaceContext } from '../components/SpaceContextProvider'
import { useCasablancaStream } from './CasablancClient/useCasablancaStream'
import { Client as CasablancaClient, Stream, isSpaceStreamId } from '@river/sdk'
import isEqual from 'lodash/isEqual'
import { useSpaceDapp } from './use-space-dapp'
import { SpaceInfo } from '@river/web3'
import { useWeb3Context } from '../components/Web3ContextProvider'
import { useQuery, useQueries, defaultStaleTime } from '../query/queryClient'
import { blockchainKeys } from '../query/query-keys'
import { isDefined } from '../utils/isDefined'
import { useOfflineStore } from '../store/use-offline-store'

const EMPTY_SPACE_INFOS: SpaceInfo[] = []

/// returns default space if no space slug is provided
export function useSpaceData(inSpaceId?: string): SpaceData | undefined {
    const { spaceId: contextSpaceId } = useSpaceContext()
    const spaceId = inSpaceId ?? contextSpaceId
    return useSpaceRollup(spaceId)
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
export function useContractSpaceInfos(client?: CasablancaClient) {
    const { provider, chain } = useWeb3Context()

    const spaceDapp = useSpaceDapp({
        chainId: chain?.id,
        provider,
    })
    const { offlineSpaceInfoMap, setOfflineSpaceInfo } = useOfflineStore()

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

    const getSpaceInfo = useCallback(
        async function (spaceId: string): Promise<SpaceInfo | undefined> {
            if (!spaceDapp || !isEnabled || spaceId.length === 0) {
                return undefined
            }
            const spaceInfo: SpaceInfo | undefined = await spaceDapp.getSpaceInfo(spaceId)
            console.log(`useContractSpaceInfos: ${spaceId}`, { spaceInfo })
            // if we don't have a spaceInfo from network for some reasons, return the cached one
            if (!spaceInfo) {
                return offlineSpaceInfoMap[spaceId]
            }
            setOfflineSpaceInfo(spaceInfo)
            return spaceInfo
        },
        [spaceDapp, isEnabled, setOfflineSpaceInfo, offlineSpaceInfoMap],
    )

    const queryData = useQueries({
        queries: spaceIds.map((id) => {
            return {
                queryKey: blockchainKeys.spaceInfo(id),
                queryFn: () => getSpaceInfo(id),
                enabled: isEnabled,
                initialData: offlineSpaceInfoMap[id],
                refetchOnMount: true,
                gcTime: defaultStaleTime,
                staleTime: defaultStaleTime,
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
    const { offlineSpaceInfoMap, setOfflineSpaceInfo } = useOfflineStore()
    const { provider, chain } = useWeb3Context()
    const spaceDapp = useSpaceDapp({
        chainId: chain?.id,
        provider,
    })

    const {
        data: spaceInfo,
        isLoading,
        error,
    } = useQuery(
        blockchainKeys.spaceInfo(spaceId ?? ''),
        async () => {
            if (!spaceDapp || !spaceId || spaceId.length === 0) {
                return undefined
            }
            const spaceInfo: SpaceInfo | undefined = await spaceDapp.getSpaceInfo(spaceId)
            console.log(`useContractSpaceInfo: ${spaceId}`, { spaceInfo })
            // if we don't have a spaceInfo from network for some reasons, return the cached one
            if (!spaceInfo) {
                return offlineSpaceInfoMap[spaceId]
            }
            setOfflineSpaceInfo(spaceInfo)
            return spaceInfo
        },
        {
            enabled: !!spaceId && !!spaceDapp,
            initialData: spaceId! ? offlineSpaceInfoMap[spaceId] : undefined,
            refetchOnMount: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            gcTime: defaultStaleTime,
            staleTime: defaultStaleTime,
        },
    )

    return useMemo(() => {
        return { data: spaceInfo, isLoading: isLoading, error: error }
    }, [spaceInfo, isLoading, error])
}

function useSpaceRollup(streamId: string | undefined): SpaceData | undefined {
    const { casablancaClient } = useTownsContext()
    const stream = useCasablancaStream(streamId)
    const { data: spaceInfo } = useContractSpaceInfo(streamId ?? '')
    const [space, setSpace] = useState<SpaceData | undefined>(undefined)
    const userStream = useCasablancaStream(casablancaClient?.userStreamId)

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
            setSpace((prev) => {
                if (isEqual(prev, newSpace)) {
                    return prev
                }
                console.log(`useSpaceRollup: updating space ${stream.streamId} ${spaceName}`, {
                    prev,
                    newSpace,
                })
                return newSpace
            })
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
            setSpace(undefined)
        }
    }, [casablancaClient, spaceInfo?.name, stream, userStream])
    return space
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
