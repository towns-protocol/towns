import {
    Client as CasablancaClient,
    isSpaceStreamId,
    isChannelStreamId,
    isDMChannelStreamId,
    isGDMChannelStreamId,
    Stream,
} from '@river/sdk'
import { useEffect, useState } from 'react'
import { SpaceInfo } from '@river/web3'
import { RoomMember, Membership, Room, toMembership } from '../../types/zion-types'
import isEqual from 'lodash/isEqual'
import { useContractSpaceInfos } from '../use-space-data'

export function useCasablancaRooms(client?: CasablancaClient): Record<string, Room | undefined> {
    const [rooms, setRooms] = useState<Record<string, Room | undefined>>({})
    const { data: spaceInfos, isLoading } = useContractSpaceInfos(client)

    //TODO: placeholder for working with Rooms in Casablanca
    useEffect(() => {
        if (!client) {
            return
        }

        // helpers
        const updateState = (streamId: string) => {
            const newRoom = streamId
                ? toZionCasablancaRoom(streamId, client, spaceInfos)
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
                    acc[stream] = toZionCasablancaRoom(stream, client, spaceInfos)
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
        console.log('useCasablancaRooms spaceInfos', spaceInfos)
        client.on('streamNewUserJoined', onStreamUpdated)
        client.on('streamUserLeft', onStreamUpdated)
        client.on('userStreamMembershipChanged', onStreamUpdated)
        client.on('streamInitialized', onStreamUpdated)
        client.on('streamDisplayNameUpdated', onStreamUpdated)
        client.on('streamPendingDisplayNameUpdated', onStreamUpdated)
        client.on('streamUsernameUpdated', onStreamUpdated)
        client.on('streamPendingUsernameUpdated', onStreamUpdated)
        return () => {
            client.off('streamNewUserJoined', onStreamUpdated)
            client.off('streamUserLeft', onStreamUpdated)
            client.off('userStreamMembershipChanged', onStreamUpdated)
            client.off('streamInitialized', onStreamUpdated)
            client.off('streamDisplayNameUpdated', onStreamUpdated)
            client.off('streamPendingDisplayNameUpdated', onStreamUpdated)
            client.off('streamUsernameUpdated', onStreamUpdated)
            client.off('streamPendingUsernameUpdated', onStreamUpdated)
            setRooms({})
        }
    }, [client, isLoading, spaceInfos])
    return rooms
}

/**
 * Get room entity filled with data for specific stream. Applicable for Channels and Spaces stream only.
 * @param streamId - The streamId of the channel or space.
 * @param client - The Casablanca client.
 * @returns Room entity filled with data for specific stream. Throw error if membership is not valid or streamId is not associated with a channel or space.
 */
function toZionCasablancaRoom(
    streamId: string,
    client: CasablancaClient,
    spaceInfos?: SpaceInfo[],
): Room {
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
    const info = spaceInfos ?? []

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
        throw new Error('Stream not found')
    }
    const { members, membersMap } = toZionMembers(stream)

    //Room topic is available only for channels
    let topic: string | undefined = undefined
    let name: string
    let isDefault: boolean = false
    if (isChannelStreamId(streamId)) {
        const parentSpace = client.streams.get(streamId)?.view.channelContent.spaceId
        if (parentSpace === undefined) {
            throw new Error('Parent space not found for streamId: ' + streamId)
        }
        const channelMetadata = client.streams
            .get(parentSpace)
            ?.view.spaceContent.spaceChannelsMetadata.get(streamId)
        name = channelMetadata?.name ?? ''
        topic = channelMetadata?.topic
        isDefault = channelMetadata?.isDefault ?? false
    } else {
        name = info.filter((i) => i !== undefined).find((i) => i.networkId == streamId)?.name ?? ''
    }

    return {
        id: streamId,
        name: name,
        membership: toMembership(userStream.view.userContent.getMembership(streamId)?.op),
        inviter: undefined,
        members: members,
        membersMap: membersMap,
        isSpaceRoom: isSpaceStreamId(streamId),
        topic: topic,
        isDefault: isDefault,
    }
}

/**
 * Get a list of joined members for specific channel or space. Applicable for Channels and Spaces stream only.
 * @param streamId - The streamId of the channel or space.
 * @param client - The Casablanca client.
 * @returns A list of members joined space or channel. Throw error if membership is not valid or streamId is not associated with a channel or space.
 */
function toZionMembers(stream: Stream): {
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

function getMembersWithMembership(membership: Membership, stream: Stream): RoomMember[] {
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
        default: {
            throw new Error('Invalid membership type: ' + membership)
        }
    }

    //TODO: construct roommembers from userId in a proper way
    users.forEach((userId) => {
        const info = metadata?.userInfo(userId)
        members.push({
            userId: userId,
            username: info?.username ?? userId,
            usernameConfirmed: info?.usernameConfirmed ?? false,
            usernameEncrypted: info?.usernameEncrypted ?? false,
            displayName: info?.displayName ?? userId,
            displayNameEncrypted: info?.displayNameEncrypted ?? false,
            avatarUrl: '',
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
        const info = metadata?.userInfo(userId)
        usersMap[userId] = {
            userId: userId,
            username: info?.username ?? '',
            usernameEncrypted: info?.usernameEncrypted ?? false,
            usernameConfirmed: info?.usernameConfirmed ?? false,
            displayName: info?.displayName ?? '',
            displayNameEncrypted: info?.displayNameEncrypted ?? false,
        }
    }
    return usersMap
}
