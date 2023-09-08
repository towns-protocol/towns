import { create } from 'zustand'

import { AuthenticationError, LoginStatus } from '../hooks/login'
import { User, RoomMember, Room, Membership, getMembershipFor } from '../types/zion-types'
import { makeRoomIdentifier } from '../types/room-identifier'

import { Client as CasablancaClient, isSpaceStreamId, isChannelStreamId, Stream } from '@river/sdk'

export type CasablancaStoreStates = {
    loginStatus: LoginStatus
    setLoginStatus: (loginStatus: LoginStatus) => void
    loginError: AuthenticationError | null
    setLoginError: (error: AuthenticationError | undefined) => void
}

export const useCasablancaStore = create<CasablancaStoreStates>((set) => ({
    loginStatus: LoginStatus.LoggedOut,
    setLoginStatus: (loginStatus: LoginStatus) =>
        loginStatus === LoginStatus.LoggedOut
            ? set({
                  loginStatus,
              })
            : loginStatus === LoginStatus.LoggingIn
            ? set({
                  loginError: null,
                  loginStatus,
              })
            : set({
                  loginStatus,
              }),
    loginError: null,
    setLoginError: (error: AuthenticationError | undefined) => set({ loginError: error ?? null }),
}))

//TODO: implement in a proper way with all fields assigned correctly
export function toZionCasablancaUser(theUser: string | undefined): User {
    return {
        userId: theUser ?? '',
        displayName: theUser ?? '',
        avatarUrl: theUser,
        presence: 'NA',
        lastPresenceTs: 0,
        currentlyActive: true,
    }
}

/**
 * Get room entity filled with data for specific stream. Applicable for Channels and Spaces stream only.
 * @param streamId - The streamId of the channel or space.
 * @param client - The Casablanca client.
 * @returns Room entity filled with data for specific stream. Throw error if membership is not valid or streamId is not associated with a channel or space.
 */
export function toZionCasablancaRoom(streamId: string, client: CasablancaClient): Room {
    //reject if client is not defined
    if (!client) {
        throw new Error('Client not defined')
    }

    const userId = client.userId
    if (!userId) {
        throw new Error('User not logged in')
    }

    //reject if streamId is not associated with a channel or space
    if (!isSpaceStreamId(streamId) && !isChannelStreamId(streamId)) {
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
    if (isChannelStreamId(streamId)) {
        const parentSpace = client.streams.get(streamId)?.view.channelContent.spaceId
        if (parentSpace === undefined) {
            throw new Error('Parent space not found for streamId: ' + streamId)
        }
        name =
            client.streams.get(parentSpace)?.view.spaceContent.spaceChannelsMetadata.get(streamId)
                ?.name ?? ''
        topic = client.streams
            .get(parentSpace)
            ?.view.spaceContent.spaceChannelsMetadata.get(streamId)?.topic
    } else {
        name = client.streams.get(streamId)?.view.spaceContent.name ?? ''
    }

    return {
        id: makeRoomIdentifier(streamId),
        name: name,
        membership: getMembershipFor(userId, stream),
        inviter: undefined,
        members: members,
        membersMap: membersMap,
        isSpaceRoom: isSpaceStreamId(streamId),
        topic: topic,
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

    const membersMap = members.reduce((result, x) => {
        result[x.userId] = x
        return result
    }, {} as { [userId: string]: RoomMember })
    return { members, membersMap }
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
    //reject if streamId is not associated with a channel or space
    if (!isSpaceStreamId(streamId) && !isChannelStreamId(streamId)) {
        throw new Error('Invalid streamId: ' + streamId)
    }

    const members: RoomMember[] = []

    let users: Set<string>

    switch (membership) {
        case Membership.Join: {
            users = stream.view.getMemberships().joinedUsers
            break
        }
        case Membership.Invite: {
            users = stream.view.getMemberships().invitedUsers
            break
        }
        default: {
            throw new Error('Invalid membership type: ' + membership)
        }
    }

    //TODO: construct roommembers from userId in a proper way
    users.forEach((userId) => {
        members.push({
            userId: userId,
            name: userId,
            rawDisplayName: userId,
            membership: membership,
            disambiguate: false,
            avatarUrl: '',
        })
    })
    return members
}
