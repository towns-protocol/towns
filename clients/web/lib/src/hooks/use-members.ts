import { useRoom } from './use-room'
import { RoomIdentifier } from '../types/room-identifier'
import { useMemo } from 'react'

/**
 * Returns all members from all rooms
 */
export function useMembers(roomId?: RoomIdentifier) {
    const room = useRoom(roomId)
    return useMemo(
        () => ({
            members: room?.members ?? [],
            membersMap: room?.membersMap ?? {},
        }),
        [room],
    )
}
