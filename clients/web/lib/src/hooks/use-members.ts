import { useMemo } from 'react'
import { useRoom } from './use-room'
import { RoomMember, UserIdToMember } from '../types/zion-types'
import { RoomIdentifier } from '../types/room-identifier'

/**
 * Returns all members from all rooms
 */
export function useMembers(roomId?: RoomIdentifier): {
    members: RoomMember[]
    membersMap: UserIdToMember
} {
    const room = useRoom(roomId)
    return useMemo(() => {
        return {
            members: room?.members ?? [],
            membersMap: room?.membersMap ?? {},
        }
    }, [room?.members, room?.membersMap])
}
