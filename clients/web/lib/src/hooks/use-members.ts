import { useRoom } from './use-room'
import { useMemo } from 'react'

/**
 * Returns all members from all rooms
 */
export function useMembers(roomId?: string) {
    const room = useRoom(roomId)
    return useMemo(
        () => ({
            memberIds: (room?.members ?? []).map((m) => m.userId),
        }),
        [room],
    )
}
