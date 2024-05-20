import {
    Client as CasablancaClient,
    isSpaceStreamId,
    isChannelStreamId,
    isDMChannelStreamId,
    isGDMChannelStreamId,
    Stream,
} from '@river/sdk'
import { useEffect, useState } from 'react'
import { RoomMember, Membership, Room, toMembership } from '../../types/towns-types'
import isEqual from 'lodash/isEqual'
import { TownsOpts } from '../../client/TownsClientTypes'
import {
    OfflineChannelMetadata,
    OfflineStates,
    useOfflineStore,
} from '../../store/use-offline-store'

export function useCasablancaRooms(
    opts: TownsOpts,
    client?: CasablancaClient,
): Record<string, Room | undefined> {
    const [rooms, setRooms] = useState<Record<string, Room | undefined>>({})

    //TODO: placeholder for working with Rooms in Casablanca
    useEffect(() => {
        if (!client) {
            return
        }

        // helpers
        const updateState = (streamId: string) => {
            const newRoom = streamId
                ? toCasablancaRoom(
                      streamId,
                      client,
                      useOfflineStore.getState().offlineChannelMetadataMap,
                  )
                : undefined
            setRooms((prev) => {
                const prevRoom = prev[streamId]
                const prevMember = prevRoom?.membership === Membership.Join
                const newMember = newRoom?.membership === Membership.Join
                // in the case of a user leaving a room, they should still get the latest update
                // if they were not a member before and still aren't, then don't update
                if (!prevMember && !newMember) {
                    return prev
                }
                return isEqual(prevRoom, newRoom) ? prev : { ...prev, [streamId]: newRoom }
            })
        }

        const setInitialState = () => {
            setRooms({})
            const allChannelsAndSpaces = client.streams
                .getStreamIds()
                .filter((stream) => {
                    return (
                        isSpaceStreamId(stream) ||
                        isChannelStreamId(stream) ||
                        isDMChannelStreamId(stream) ||
                        isGDMChannelStreamId(stream)
                    )
                })
                .reduce((acc: Record<string, Room | undefined>, stream: string) => {
                    acc[stream] = toCasablancaRoom(
                        stream,
                        client,
                        useOfflineStore.getState().offlineChannelMetadataMap,
                    )
                    return acc
                }, {})
            setRooms(allChannelsAndSpaces)
        }

        // initial state
        setInitialState()

        // subscribe to changes
        const onStreamUpdated = (streamId: string) => {
            if (
                isSpaceStreamId(streamId) ||
                isChannelStreamId(streamId) ||
                isDMChannelStreamId(streamId) ||
                isGDMChannelStreamId(streamId)
            ) {
                updateState(streamId)
            }
        }

        const onChannelUpdated = (_spaceId: string, channelId: string) => {
            updateState(channelId)
        }

        const onOfflineStoreChange = (store: OfflineStates, prev: OfflineStates) => {
            if (!isEqual(store.offlineChannelMetadataMap, prev.offlineChannelMetadataMap)) {
                const channelIds = Object.keys(store.offlineChannelMetadataMap)
                channelIds.forEach((channelId) => {
                    if (
                        !isEqual(
                            store.offlineChannelMetadataMap[channelId],
                            prev.offlineChannelMetadataMap[channelId],
                        )
                    ) {
                        updateState(channelId)
                    }
                })
            }
        }

        const unsubMetadata = useOfflineStore.subscribe(onOfflineStoreChange)

        client.on('streamNewUserJoined', onStreamUpdated)
        client.on('streamUserLeft', onStreamUpdated)
        client.on('userStreamMembershipChanged', onStreamUpdated)
        client.on('streamInitialized', onStreamUpdated)
        client.on('streamDisplayNameUpdated', onStreamUpdated)
        client.on('streamPendingDisplayNameUpdated', onStreamUpdated)
        client.on('streamUsernameUpdated', onStreamUpdated)
        client.on('streamPendingUsernameUpdated', onStreamUpdated)
        client.on('spaceChannelUpdated', onChannelUpdated)
        client.on('streamEnsAddressUpdated', onStreamUpdated)
        client.on('streamNftUpdated', onStreamUpdated)

        return () => {
            unsubMetadata()
            client.off('streamNewUserJoined', onStreamUpdated)
            client.off('streamUserLeft', onStreamUpdated)
            client.off('userStreamMembershipChanged', onStreamUpdated)
            client.off('streamInitialized', onStreamUpdated)
            client.off('streamDisplayNameUpdated', onStreamUpdated)
            client.off('streamPendingDisplayNameUpdated', onStreamUpdated)
            client.off('streamUsernameUpdated', onStreamUpdated)
            client.off('streamPendingUsernameUpdated', onStreamUpdated)
            client.off('spaceChannelUpdated', onChannelUpdated)
            client.off('streamEnsAddressUpdated', onStreamUpdated)
            client.off('streamNftUpdated', onStreamUpdated)
            setRooms({})
        }
    }, [client])
    return rooms
}

/**
 * Get room entity filled with data for specific stream. Applicable for Channels and Spaces stream only.
 * @param streamId - The streamId of the channel or space.
 * @param client - The Casablanca client.
 * @returns Room entity filled with data for specific stream. Throw error if membership is not valid or streamId is not associated with a channel or space.
 */
function toCasablancaRoom(
    streamId: string,
    client: CasablancaClient,
    offlineChannelInfoMap: Record<string, OfflineChannelMetadata>,
): Room | undefined {
    //reject if client is not defined
    if (!client) {
        throw new Error('Client not defined')
    }

    const userStreamId = client.userStreamId
    if (!userStreamId) {
        throw new Error('User not logged in')
    }
    const userStream = client.streams.get(userStreamId)
    if (!userStream) {
        throw new Error('User not logged in')
    }

    //reject if streamId is not associated with a channel, space or DM
    if (
        !isSpaceStreamId(streamId) &&
        !isChannelStreamId(streamId) &&
        !isDMChannelStreamId(streamId) &&
        !isGDMChannelStreamId(streamId)
    ) {
        throw new Error('Invalid streamId: ' + streamId)
    }

    const stream = client.streams.get(streamId)
    if (!stream) {
        return undefined
    }
    const { members, membersMap } = toTownsMembers(stream)

    let isDefault: boolean = false
    if (isChannelStreamId(streamId)) {
        const parentSpace = client.streams.get(streamId)?.view.channelContent.spaceId
        if (parentSpace === undefined) {
            throw new Error('Parent space not found for streamId: ' + streamId)
        }
        const channelMetadata = client.streams
            .get(parentSpace)
            ?.view.spaceContent.spaceChannelsMetadata.get(streamId)
        isDefault = channelMetadata?.isDefault ?? false
    }

    const name = offlineChannelInfoMap[streamId]?.channel.name ?? streamId

    return {
        id: streamId,
        name,
        membership: toMembership(userStream.view.userContent.getMembership(streamId)?.op),
        inviter: undefined,
        members: members,
        membersMap: membersMap,
        isSpaceRoom: isSpaceStreamId(streamId),
        topic: undefined,
        isDefault: isDefault,
    }
}

/**
 * Get a list of joined members for specific channel or space. Applicable for Channels and Spaces stream only.
 * @param streamId - The streamId of the channel or space.
 * @param client - The Casablanca client.
 * @returns A list of members joined space or channel. Throw error if membership is not valid or streamId is not associated with a channel or space.
 */
function toTownsMembers(stream: Stream): {
    members: RoomMember[]
    membersMap: { [userId: string]: RoomMember }
} {
    const members: RoomMember[] = getMembersWithMembership(Membership.Join, stream)
    const usersMap = getUsersMap(stream)
    return { members, membersMap: usersMap }
}

/**
 * Get a list of members with given membership state. Applicable for Channels and Spaces stream only.
 * @param membership - The membership state.
 * @param streamId - The streamId of the channel or space.
 * @param client - The Casablanca client.
 * @returns A list of members with the given membership state. Throw error if membership is not valid or streamId is not associated with a channel or space.
 */

export function getMembersWithMembership(membership: Membership, stream: Stream): RoomMember[] {
    const streamId = stream.view.streamId
    //reject if streamId is not associated with a channel, space or DM
    if (
        !isSpaceStreamId(streamId) &&
        !isChannelStreamId(streamId) &&
        !isDMChannelStreamId(streamId) &&
        !isGDMChannelStreamId(streamId)
    ) {
        throw new Error('Invalid streamId: ' + streamId)
    }

    const metadata = stream.view.getUserMetadata()
    const members: RoomMember[] = []

    let users: Set<string>

    switch (membership) {
        case Membership.Join: {
            users = stream.view.getMembers().membership.joinedUsers
            break
        }
        case Membership.Invite: {
            users = stream.view.getMembers().membership.invitedUsers
            break
        }
        case Membership.Leave:
            users = stream.view.getMembers().membership.leftUsers
            break
        default: {
            throw new Error('Invalid membership type: ' + membership)
        }
    }

    //TODO: construct roommembers from userId in a proper way
    users.forEach((userId) => {
        const info = metadata.userInfo(userId)
        members.push({
            userId: userId,
            username: info?.username ?? userId,
            usernameConfirmed: info?.usernameConfirmed ?? false,
            usernameEncrypted: info?.usernameEncrypted ?? false,
            displayName: info?.displayName ?? userId,
            displayNameEncrypted: info?.displayNameEncrypted ?? false,
            avatarUrl: '',
            ensAddress: info?.ensAddress,
            nft: info?.nft,
        })
    })
    return members
}

function getUsersMap(stream: Stream): { [userId: string]: RoomMember } {
    const memberships = stream.view.getMembers()
    const allUsers = memberships.participants()

    const metadata = stream.view.getUserMetadata()
    const usersMap = {} as { [userId: string]: RoomMember }
    for (const userId of allUsers) {
        const info = metadata.userInfo(userId)
        usersMap[userId] = {
            userId: userId,
            username: info?.username ?? '',
            usernameEncrypted: info?.usernameEncrypted ?? false,
            usernameConfirmed: info?.usernameConfirmed ?? false,
            displayName: info?.displayName ?? '',
            displayNameEncrypted: info?.displayNameEncrypted ?? false,
            ensAddress: info?.ensAddress,
            nft: info?.nft,
        }
    }
    return usersMap
}
