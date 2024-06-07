import { useRoom } from './use-room'
import { useMemo } from 'react'

/**
 * Returns members from the specified room
 */
export function useMembers(roomId?: string) {
    const room = useRoom(roomId)
    return useMemo(
        () => ({
            members: room?.members ?? [],
            memberIds: (room?.members ?? []).map((m) => m.userId),
        }),
        [room],
    )
}
