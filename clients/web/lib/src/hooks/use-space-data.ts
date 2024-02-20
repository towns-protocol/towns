import { useCallback, useEffect, useMemo, useState } from 'react'
import { InviteData, Membership, SpaceData, toMembership } from '../types/zion-types'
import { useZionContext } from '../components/ZionContextProvider'
import { useSpaceContext } from '../components/SpaceContextProvider'
import { useCasablancaStream } from './CasablancClient/useCasablancaStream'
import { Client as CasablancaClient, Stream, isSpaceStreamId } from '@river/sdk'
import isEqual from 'lodash/isEqual'
import { useSpaceDapp } from './use-space-dapp'
import { SpaceInfo } from '@river/web3'
import { useWeb3Context } from '../components/Web3ContextProvider'
import { useQuery } from '../query/queryClient'
import { blockchainKeys } from '../query/query-keys'
import { isDefined } from '../utils/isDefined'

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
export function useSpaceNames(client?: CasablancaClient) {
    const { provider, chain } = useWeb3Context()

    const spaceDapp = useSpaceDapp({
        chainId: chain?.id,
        provider,
    })

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

    const getSpaceNames = useCallback(
        async function (): Promise<SpaceInfo[]> {
            if (!spaceDapp || !isEnabled || spaceIds.length === 0) {
                return []
            }
            const getSpaceInfoPromises = spaceIds.map((streamId) =>
                spaceDapp.getSpaceInfo(streamId),
            )
            const spaceInfos = await Promise.all(getSpaceInfoPromises)
            console.log(`useSpaceNames: spaceInfos executed with `, spaceIds, spaceInfos)
            return spaceInfos.filter(isDefined)
        },
        [spaceDapp, isEnabled, spaceIds],
    )

    const queryData = useQuery(
        spaceIds,
        getSpaceNames,
        // options for the query.
        {
            enabled: isEnabled,
            refetchOnMount: true,
        },
    )

    useEffect(() => {
        console.log(`queryData changed`, queryData.data, queryData.isLoading)
    }, [queryData.data, queryData.isLoading])

    return {
        data: queryData.data,
        isLoading: queryData.isLoading,
    }
}

export function useSpaceName(spaceId: string) {
    const { provider, chain } = useWeb3Context()
    const spaceDapp = useSpaceDapp({
        chainId: chain?.id,
        provider,
    })

    const isEnabled = spaceDapp && spaceId.length > 0

    const getSpaceName = useCallback(
        async function () {
            if (!spaceDapp || !isEnabled || !spaceId || spaceId.length === 0) {
                return undefined
            }
            const info = await spaceDapp.getSpaceInfo(spaceId)
            return info?.name ?? ''
        },
        [spaceDapp, isEnabled, spaceId],
    )

    const {
        isLoading,
        data: spaceName,
        error,
    } = useQuery(
        blockchainKeys.spaceName(spaceId),
        getSpaceName,
        // options for the query.
        {
            enabled: isEnabled,
            refetchOnMount: true,
        },
    )

    return {
        isLoading,
        spaceName,
        error,
    }
}

function useSpaceRollup(streamId: string | undefined): SpaceData | undefined {
    const { casablancaClient } = useZionContext()
    const stream = useCasablancaStream(streamId)
    const { isLoading, spaceName, error } = useSpaceName(streamId ?? '')
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
            const membership = toMembership(
                userStream.view.userContent.getMembership(stream.streamId)?.op,
            )
            const channelIds = Array.from(stream.view.spaceContent.spaceChannelsMetadata.keys())
            console.log(
                `useSpaceRollup: updating space ${stream.streamId} with spaceName ${
                    spaceName ?? ''
                }`,
            )
            const newSpace = rollupSpace(stream, membership, channelIds, spaceName)
            setSpace((prev) => {
                if (isEqual(prev, newSpace)) {
                    return prev
                }
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
    }, [casablancaClient, stream, isLoading, spaceName, error, userStream])
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
