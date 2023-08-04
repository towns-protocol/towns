/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Stream } from '@river/sdk'
import { Room, RoomMember } from '../../types/zion-types'
import { makeCasablancaStreamIdentifier } from '../../types/room-identifier'
import { Membership } from '../../types/zion-types'

export function toZionRoomFromStream(stream: Stream, userId: string): Room {
    // todo casablanca: implement this to the end
    let membership = ''

    if (stream.view.invitedUsers.has(userId)) {
        membership = Membership.Invite
    } else if (stream.view.joinedUsers.has(userId)) {
        membership = Membership.Join
    }

    const members: RoomMember[] = Array.from(stream.view.joinedUsers, (userId) => ({
        userId: userId,
        membership: Membership.Join,
        name: '',
        rawDisplayName: '',
        disambiguate: false,
    }))

    const memberMap = members.reduce((acc, member) => {
        acc[member.userId] = member
        return acc
    }, {} as Record<string, RoomMember>)

    return {
        id: makeCasablancaStreamIdentifier(stream.streamId),
        name: '',
        membership: membership,
        inviter: '',
        members: members,
        membersMap: memberMap,
        isSpaceRoom: false,
    }
}
