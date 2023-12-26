/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Stream } from '@river/sdk'
import { Room, RoomMember } from '../../types/zion-types'
import { Membership } from '../../types/zion-types'

export function toZionRoomFromStream(stream: Stream, userId: string): Room {
    // todo casablanca: implement this to the end
    let membership = ''

    if (stream.view.getMemberships().invitedUsers.has(userId)) {
        membership = Membership.Invite
    } else if (stream.view.getMemberships().joinedUsers.has(userId)) {
        membership = Membership.Join
    }

    const metadata = stream.view.getUserMetadata()

    const members: RoomMember[] = Array.from(stream.view.getMemberships().joinedUsers, (userId) => {
        const info = metadata?.userInfo(userId)
        return {
            userId: userId,
            membership: Membership.Join,
            username: info?.username ?? '',
            usernameConfirmed: info?.usernameConfirmed ?? false,
            usernameEncrypted: info?.usernameEncrypted ?? false,
            displayName: info?.displayName ?? '',
            displayNameEncrypted: info?.displayNameEncrypted ?? false,
            disambiguate: false,
        }
    })

    const memberMap = members.reduce((acc, member) => {
        acc[member.userId] = member
        return acc
    }, {} as Record<string, RoomMember>)

    return {
        id: stream.streamId,
        name: '',
        membership: membership,
        inviter: '',
        members: members,
        membersMap: memberMap,
        isSpaceRoom: false,
    }
}
