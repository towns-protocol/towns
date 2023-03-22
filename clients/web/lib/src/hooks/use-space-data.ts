import { useMemo } from 'react'
import {
    Channel,
    ChannelGroup,
    InviteData,
    Room,
    SpaceChild,
    SpaceData,
    SpaceHierarchies,
    SpaceHierarchy,
} from '../types/zion-types'
import { RoomIdentifier } from '../types/room-identifier'
import { useZionClient } from './use-zion-client'
import { useRoom } from './use-room'
import { useZionContext } from '../components/ZionContextProvider'
import { useSpaceContext } from '../components/SpaceContextProvider'

/// returns default space if no space slug is provided
export function useSpaceData(): SpaceData | undefined {
    const { defaultSpaceId, defaultSpaceAvatarSrc, defaultSpaceName, spaceHierarchies } =
        useZionContext()
    const { spaceId } = useSpaceContext()
    const { clientRunning } = useZionClient()
    const spaceRoom = useRoom(spaceId)
    const spaceHierarchy = useMemo(
        () => (spaceId?.networkId ? spaceHierarchies[spaceId.networkId] : undefined),
        [spaceId?.networkId, spaceHierarchies],
    )
    return useMemo(() => {
        if (spaceRoom || spaceHierarchy) {
            return formatSpace(
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                spaceRoom ?? spaceHierarchy!.root,
                spaceHierarchy,
                spaceRoom?.membership ?? '',
                '/placeholders/nft_29.png',
            )
        } else if (
            clientRunning &&
            defaultSpaceId &&
            spaceId?.networkId == defaultSpaceId?.networkId
        ) {
            // this bit is temporary because client.peek(...) ("rooms_initial_sync") is unimplemented in dendrite https://github.com/HereNotThere/harmony/issues/188
            const defaultSpaceRoom: Room = {
                id: defaultSpaceId,
                name: defaultSpaceName ?? 'Default Space',
                members: [],
                membersMap: {},
                membership: '',
                isSpaceRoom: true,
            }
            return formatSpace(
                defaultSpaceRoom,
                undefined,
                defaultSpaceRoom.membership,
                defaultSpaceAvatarSrc ?? '/placeholders/nft_29.png',
            )
        }
        return undefined
    }, [
        clientRunning,
        defaultSpaceAvatarSrc,
        defaultSpaceId,
        defaultSpaceName,
        spaceHierarchy,
        spaceRoom,
        spaceId,
    ])
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
