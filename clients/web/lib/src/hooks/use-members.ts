import { useMemo } from 'react'
import { useRoom } from './use-room'
import { RoomIdentifier, RoomMember } from '../types/matrix-types'

/**
 * Returns all members from all rooms
 */
export function useMembers(roomId?: RoomIdentifier): {
    members: RoomMember[]
    membersMap: { [userId: string]: RoomMember }
} {
    const room = useRoom(roomId)
    return useMemo(() => {
        return {
            members: room?.members ?? [],
            membersMap: room?.membersMap ?? {},
        }
    }, [room?.members, room?.membersMap])
}
