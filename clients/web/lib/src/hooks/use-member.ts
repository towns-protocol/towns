import { RoomMember } from '../types/zion-types'
import { RoomIdentifier } from '../types/room-identifier'
import { useCasablancaStreamMember } from './CasablancClient/useCasablancaStreamMember'

/// useMember provides the current membership state, displayname, avatar, etc of a user in a room.
/// note: it might be useful to combine with useUser, which provides the basic user info.
export function useMember(roomId?: RoomIdentifier, userId?: string): RoomMember | undefined {
    const casablancaMember = useCasablancaStreamMember(roomId, userId)
    return casablancaMember
}
