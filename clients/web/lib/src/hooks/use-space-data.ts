import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    Channel,
    ChannelGroup,
    InviteData,
    Room,
    SpaceChild,
    SpaceData,
    SpaceHierarchies,
    SpaceHierarchy,
    getMembershipFor,
} from '../types/zion-types'
import { useRoom, useRoomNames } from './use-room'
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
    const { spaceHierarchies } = useZionContext()
    const { spaceId: contextSpaceId } = useSpaceContext()
    const spaceId = inSpaceId ?? contextSpaceId
    // https://linear.app/hnt-labs/issue/HNT-4575/simplify-use-space-data-hook
    // the space holds the channel ids, but
    // we don't sync the channels until after joining, so blend the hierarchy data
    // with local data and hope the channel names come out right.
    const spaceRoom = useRoom(spaceId)
    const spaceHierarchy = useMemo(
        () => (spaceId ? spaceHierarchies[spaceId] : undefined),
        [spaceId, spaceHierarchies],
    )
    const spaceRoomNames = useRoomNames(spaceHierarchy?.children.map((c) => c.id) ?? [])
    // casablanca is much simpler, just get the data from the stream
    const casablancaSpaceData = useSpaceRollup(spaceId)

    return useMemo(() => {
        if (casablancaSpaceData) {
            return casablancaSpaceData
        } else if (spaceRoom || spaceHierarchy) {
            return formatSpace(
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                spaceRoom ?? spaceHierarchy!.root,
                spaceHierarchy,
                spaceRoom?.membership ?? '',
                '/placeholders/nft_29.png',
                spaceRoomNames,
            )
        }
        return undefined
    }, [casablancaSpaceData, spaceRoom, spaceHierarchy, spaceRoomNames])
}

export function useInvites(): InviteData[] {
    const { invitedToIds, spaceHierarchies, client } = useZionContext()
    return useMemo(
        () =>
            invitedToIds
                .map((id) => {
                    const room = client?.getRoomData(id)
                    if (!room) {
                        return undefined
                    }
                    return formatInvite(
                        room,
                        getParentSpaceId(id, spaceHierarchies),
                        '/placeholders/nft_29.png',
                    )
                })
                .filter((x) => x !== undefined) as InviteData[],
        [client, invitedToIds, spaceHierarchies],
    )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const useInvitesForSpace = (spaceId: string) => {
    // todo this doesn't work yet
    return useInvites()
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

function getParentSpaceId(roomId: string, spaces: SpaceHierarchies): string | undefined {
    const hasChild = (space: SpaceHierarchy, id: string) =>
        space.children.some((child) => child.id === id)

    const parentId = Object.values(spaces).find((space) => hasChild(space, roomId))?.root.id
    return parentId
}

/// formatting helper for changing a room join to a space
function formatSpace(
    root: Room | SpaceChild,
    spaceHierarchy: SpaceHierarchy | undefined,
    membership: string,
    avatarSrc: string,
    roomNames: Record<string, string>,
): SpaceData {
    return formatRoom(
        root,
        membership,
        avatarSrc,
        toChannelGroups(spaceHierarchy?.children ?? [], roomNames),
        spaceHierarchy,
    )
}

/// formatting helper for changing a room to a space
export function formatRoom(
    r: Room | SpaceChild,
    membership: string,
    avatarSrc: string,
    channelGroups: ChannelGroup[] = [],
    spaceHierarchy: SpaceHierarchy | undefined,
): SpaceData {
    return {
        id: r.id,
        name: r.name,
        avatarSrc: avatarSrc,
        channelGroups: channelGroups,
        membership: membership,
        // 3.21.23 adding this prop instead of changing channelGroups always being an array, in case code is relying on that
        isLoadingChannels: spaceHierarchy?.children === undefined,
        hasLoadedMemberships: true,
    }
}

function formatInvite(r: Room, spaceParentId: string | undefined, avatarSrc: string): InviteData {
    return {
        id: r.id,
        name: r.name,
        avatarSrc: avatarSrc,
        isSpaceRoom: r.isSpaceRoom,
        spaceParentId: spaceParentId,
    }
}

function formatChannel(spaceChild: SpaceChild, roomNames: Record<string, string>): Channel {
    const roomName = roomNames[spaceChild.id]
    return {
        id: spaceChild.id,
        label: roomName ?? spaceChild.name ?? '',
        private: !spaceChild.worldReadable,
        highlight: false,
        topic: spaceChild.topic,
    }
}

function toChannelGroup(
    label: string,
    channels: SpaceChild[],
    roomNames: Record<string, string>,
): ChannelGroup {
    return {
        label: label,
        channels: channels.map((c) => formatChannel(c, roomNames)),
    }
}

function toChannelGroups(
    children: SpaceChild[],
    roomNames: Record<string, string>,
): ChannelGroup[] {
    if (children.length === 0) {
        return []
    }
    // the backend doesn't yet support tags, just return all channels in the "Channels" group
    return [toChannelGroup('Channels', children, roomNames)]
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
            if (!isEqual(newSpaceIds, spaceIds)) {
                setSpaceIds(newSpaceIds)
            }
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
    }, [isEnabled, client, spaceIds, setSpaceIds])

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

    useEffect(() => {
        if (!stream || !casablancaClient) {
            return
        }
        if (stream.view.contentKind !== 'spaceContent') {
            console.error('useSpaceRollup called with non-space stream')
            return
        }

        const userId = casablancaClient.userId

        // wrap the update op, we get the channel ids and
        // rollup the space channels into a space
        const update = () => {
            const channelIds = Array.from(stream.view.spaceContent.spaceChannelsMetadata.keys())
            console.log(
                `useSpaceRollup: updating space ${stream.streamId} with spaceName ${
                    spaceName ?? ''
                }`,
            )
            const newSpace = rollupSpace(stream, userId, channelIds, spaceName)
            setSpace((prev) => {
                if (isEqual(prev, newSpace)) {
                    return prev
                }
                return newSpace
            })
        }

        // if any channel is updated in this stream, update it
        const onSpaceChannelUpdated = (spaceId: string) => {
            if (spaceId === stream.streamId) {
                update()
            }
        }

        // run the first update
        update()

        // add listeners
        casablancaClient.on('streamInitialized', onSpaceChannelUpdated)
        casablancaClient.on('spaceChannelCreated', onSpaceChannelUpdated)
        casablancaClient.on('spaceChannelUpdated', onSpaceChannelUpdated)
        casablancaClient.on('streamMyMembershipUpdated', onSpaceChannelUpdated)

        return () => {
            // remove lsiteners and clear state when the effect stops
            casablancaClient.off('streamInitialized', onSpaceChannelUpdated)
            casablancaClient.off('spaceChannelCreated', onSpaceChannelUpdated)
            casablancaClient.off('spaceChannelUpdated', onSpaceChannelUpdated)
            casablancaClient.off('streamMyMembershipUpdated', onSpaceChannelUpdated)
            setSpace(undefined)
        }
    }, [casablancaClient, stream, isLoading, spaceName, error])
    return space
}

function rollupSpace(
    stream: Stream,
    userId: string,
    channels: string[],
    spaceName?: string,
): SpaceData | undefined {
    if (stream.view.contentKind !== 'spaceContent') {
        throw new Error('stream is not a space')
    }

    const membership = getMembershipFor(userId, stream)

    return {
        id: stream.view.streamId,
        name: spaceName ?? '',
        avatarSrc: '',
        channelGroups: [
            {
                label: 'Channels',
                // channels: Array.from(stream.view.spaceChannels)
                //     .sort()
                //     .map((c) => ({
                //         id: makeRoomIdentifier(c),
                //         label: c,
                //         private: false,
                //         highlight: false,
                //         topic: '',
                //     })),
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
