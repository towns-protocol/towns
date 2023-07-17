import { useEffect, useMemo, useState } from 'react'
import {
    Channel,
    ChannelGroup,
    InviteData,
    Membership,
    Room,
    SpaceChild,
    SpaceData,
    SpaceHierarchies,
    SpaceHierarchy,
} from '../types/zion-types'
import { RoomIdentifier, makeRoomIdentifier } from '../types/room-identifier'
import { useRoom } from './use-room'
import { useZionContext } from '../components/ZionContextProvider'
import { useSpaceContext } from '../components/SpaceContextProvider'
import { useCasablancaStream } from './CasablancClient/useCasablancaStream'
import { Stream } from '@towns/sdk'
import isEqual from 'lodash/isEqual'

/// returns default space if no space slug is provided
export function useSpaceData(inSpaceId?: RoomIdentifier): SpaceData | undefined {
    const { spaceHierarchies } = useZionContext()
    const { spaceId: contextSpaceId } = useSpaceContext()
    const spaceId = inSpaceId ?? contextSpaceId
    const spaceRoom = useRoom(spaceId)
    const spaceHierarchy = useMemo(
        () => (spaceId?.networkId ? spaceHierarchies[spaceId.networkId] : undefined),
        [spaceId?.networkId, spaceHierarchies],
    )
    const casablancaSpaceData = useSpaceRollup(spaceId?.networkId)

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
            )
        }
        return undefined
    }, [spaceHierarchy, spaceRoom, casablancaSpaceData])
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
                        getParentSpaceId(id.networkId, spaceHierarchies),
                        '/placeholders/nft_29.png',
                    )
                })
                .filter((x) => x !== undefined) as InviteData[],
        [client, invitedToIds, spaceHierarchies],
    )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const useInvitesForSpace = (spaceId: RoomIdentifier) => {
    // todo this doesn't work yet
    return useInvites()
}

export const useInviteData = (slug: string | undefined) => {
    const invites = useInvites()
    return useMemo(
        () =>
            invites.find((invite) => {
                return invite.id.slug === slug || invite.id.slug === encodeURIComponent(slug || '')
            }),
        [invites, slug],
    )
}

function getParentSpaceId(roomId: string, spaces: SpaceHierarchies): RoomIdentifier | undefined {
    const hasChild = (space: SpaceHierarchy, id: string) =>
        space.children.some((child) => child.id.networkId === id)

    const parentId = Object.values(spaces).find((space) => hasChild(space, roomId))?.root.id
    return parentId
}

/// formatting helper for changing a room join to a space
function formatSpace(
    root: Room | SpaceChild,
    spaceHierarchy: SpaceHierarchy | undefined,
    membership: string,
    avatarSrc: string,
): SpaceData {
    return formatRoom(
        root,
        membership,
        avatarSrc,
        toChannelGroups(spaceHierarchy?.children ?? []),
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
    }
}

function formatInvite(
    r: Room,
    spaceParentId: RoomIdentifier | undefined,
    avatarSrc: string,
): InviteData {
    return {
        id: r.id,
        name: r.name,
        avatarSrc: avatarSrc,
        isSpaceRoom: r.isSpaceRoom,
        spaceParentId: spaceParentId,
    }
}

function formatChannel(spaceChild: SpaceChild): Channel {
    return {
        id: spaceChild.id,
        label: spaceChild.name ?? '',
        private: !spaceChild.worldReadable,
        highlight: false,
        topic: spaceChild.topic,
    }
}

function toChannelGroup(label: string, channels: SpaceChild[]): ChannelGroup {
    return {
        label: label,
        channels: channels.map(formatChannel),
    }
}

function toChannelGroups(children: SpaceChild[]): ChannelGroup[] {
    if (children.length === 0) {
        return []
    }
    // the backend doesn't yet support tags, just return all channels in the "Channels" group
    return [toChannelGroup('Channels', children)]
}

function useSpaceRollup(streamId: string | undefined): SpaceData | undefined {
    const { casablancaClient } = useZionContext()
    const stream = useCasablancaStream(streamId)
    const [space, setSpace] = useState<SpaceData | undefined>(undefined)

    useEffect(() => {
        if (!stream || !casablancaClient) {
            return
        }
        if (stream.view.payloadKind !== 'spacePayload') {
            console.error('useSpaceRollup called with non-space stream')
            return
        }

        const userId = casablancaClient.userId

        // wrap the update op, we get the channel ids and
        // rollup the space channels into a space
        const update = () => {
            const channelIds = Array.from(stream.view.spaceChannelsMetadata.keys())
            const newSpace = rollupSpace(stream, userId, channelIds)
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
        casablancaClient.on('spaceChannelCreated', onSpaceChannelUpdated)
        casablancaClient.on('spaceChannelUpdated', onSpaceChannelUpdated)

        return () => {
            // remove lsiteners and clear state when the effect stops
            casablancaClient.off('spaceChannelCreated', onSpaceChannelUpdated)
            casablancaClient.off('spaceChannelUpdated', onSpaceChannelUpdated)
            setSpace(undefined)
        }
    }, [casablancaClient, stream])
    return space
}

function rollupSpace(stream: Stream, userId: string, channels: string[]): SpaceData | undefined {
    if (stream.view.payloadKind !== 'spacePayload') {
        throw new Error('stream is not a space')
    }

    const membership = stream.view.userJoinedStreams.has(userId)
        ? Membership.Join
        : stream.view.userInvitedStreams.has(userId)
        ? Membership.Invite
        : Membership.None

    return {
        id: makeRoomIdentifier(stream.view.streamId),
        name: stream.view.streamId,
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
                        id: makeRoomIdentifier(c),
                        label: stream.view.spaceChannelsMetadata.get(c)?.channelName ?? c,
                        private: false,
                        highlight: false,
                        topic: stream.view.spaceChannelsMetadata.get(c)?.channelTopic ?? '',
                    })),
            },
        ],
        membership: membership,
        isLoadingChannels: false,
    }
}
