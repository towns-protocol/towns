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
            memberIds: (room?.members ?? []).map((m) => m.userId),
        }),
        [room],
    )
}
