/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Stream } from '@towns/sdk'
import { Room } from '../../types/zion-types'
import { makeCasablancaStreamIdentifier } from '../../types/room-identifier'
import { Membership } from '../../types/zion-types'

export function toZionRoomFromStream(stream: Stream, userId: string): Room {
    // todo casablanca: implement this to the end
    let membership = ''

    if (stream.rollup.invitedUsers.has(userId)) {
        membership = Membership.Invite
    } else if (stream.rollup.joinedUsers.has(userId)) {
        membership = Membership.Join
    }

    return {
        id: makeCasablancaStreamIdentifier(stream.streamId),
        name: '',
        membership: membership,
        inviter: '',
        members: [],
        membersMap: {},
        isSpaceRoom: false,
    }
}
