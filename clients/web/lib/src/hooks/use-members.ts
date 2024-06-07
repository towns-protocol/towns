import { useRoom } from './use-room'

/**
 * Returns members from the specified room
 */
export function useMembers(roomId?: string) {
    const memberIds = useRoom(roomId)?.members ?? []
    return { memberIds }
}
