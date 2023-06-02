import { useMemo } from 'react'
import { useRoom } from './use-room'
import { RoomMember } from '../types/zion-types'
import { RoomIdentifier } from '../types/room-identifier'

/**
 * Returns all members from all rooms
 */
export function useMembers(roomId?: RoomIdentifier): {
    members: RoomMember[]
    membersMap: { [userId: string]: RoomMember | undefined }
} {
    const room = useRoom(roomId)
    return useMemo(() => {
        return {
            members: room?.members ?? [],
            membersMap: room?.membersMap ?? {},
        }
    }, [room?.members, room?.membersMap])
}
