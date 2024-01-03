import { create } from 'zustand'

import { AuthenticationError, LoginStatus } from '../hooks/login'
import { RoomMember, Room, Membership, getMembershipFor } from '../types/zion-types'

import {
    Client as CasablancaClient,
    isSpaceStreamId,
    isChannelStreamId,
    Stream,
    isDMChannelStreamId,
    isGDMChannelStreamId,
} from '@river/sdk'
import { SpaceInfo } from '@river/web3'

export type CasablancaStoreStates = {
    loginStatus: LoginStatus
    setLoginStatus: (loginStatus: LoginStatus) => void
    loginError: AuthenticationError | null
    setLoginError: (error: AuthenticationError | undefined) => void
}

export const useCasablancaStore = create<CasablancaStoreStates>((set) => ({
    loginStatus: LoginStatus.LoggedOut,
    setLoginStatus: (loginStatus: LoginStatus) => set({ loginStatus }),
    loginError: null,
    setLoginError: (error: AuthenticationError | undefined) => {
        set({ loginError: error ?? null })
    },
}))

//TODO: implement in a proper way with all fields assigned correctly
export function toZionCasablancaUser(theUser: string | undefined): RoomMember {
    return {
        userId: theUser ?? '',
        username: theUser ?? '',
        usernameConfirmed: true,
        usernameEncrypted: false,
        displayName: theUser ?? '',
        displayNameEncrypted: false,
        avatarUrl: theUser,
    }
}

/**
 * Get room entity filled with data for specific stream. Applicable for Channels and Spaces stream only.
 * @param streamId - The streamId of the channel or space.
 * @param client - The Casablanca client.
 * @returns Room entity filled with data for specific stream. Throw error if membership is not valid or streamId is not associated with a channel or space.
 */
export function toZionCasablancaRoom(
    streamId: string,
    client: CasablancaClient,
    spaceInfos?: SpaceInfo[],
): Room {
    //reject if client is not defined
    if (!client) {
        throw new Error('Client not defined')
    }

    const userId = client.userId
    if (!userId) {
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
        name = info.filter((i) => i !== undefined).find((i) => i.networkId == streamId)?.name ?? ''
    }

    return {
        id: streamId,
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
    const memberships = stream.view.getMemberships()
    const allUsers = new Set<string>([
        ...memberships.joinedUsers,
        ...memberships.invitedUsers,
        ...memberships.leftUsers,
    ])

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
