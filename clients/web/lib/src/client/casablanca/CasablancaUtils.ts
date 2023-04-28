/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Stream } from '@towns/sdk'
import { Room } from '../../types/zion-types'
import { makeCasablancaStreamIdentifier } from '../../types/room-identifier'

export function toZionRoomFromStream(stream: Stream): Room {
    // todo casablanca: implement this
    return {
        id: makeCasablancaStreamIdentifier(stream.streamId),
        name: '',
        membership: '',
        inviter: '',
        members: [],
        membersMap: {},
        isSpaceRoom: false,
    }
}
