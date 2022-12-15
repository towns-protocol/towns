import { Stream } from '@zion/client'
import { Room } from '../../types/matrix-types'
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
