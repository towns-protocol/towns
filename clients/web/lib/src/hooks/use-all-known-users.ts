import { useMemo } from 'react'
import { useZionContext } from '../components/ZionContextProvider'
import { RoomMember } from 'types/zion-types'

/**
 * @returns an array of all known users in all spaces.
 */

export function useAllKnownUsers() {
    const { spaces } = useZionContext()
    const { rooms } = useZionContext()

    const users = useMemo(() => {
        const spaceIds = spaces.map((space) => space.id.networkId)
        // The same user can be a member of multiple spaces.
        // The Map makes sure we only return 1 instance of each user.
        const users = new Map<string, RoomMember>()
        for (const spaceId of spaceIds) {
            const room = rooms[spaceId]
            if (room) {
                for (const member of room.members) {
                    users.set(member.userId, member)
                }
            }
        }
        return [...users.values()]
    }, [spaces, rooms])

    return { users }
}
