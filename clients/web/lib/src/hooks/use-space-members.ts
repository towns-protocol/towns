import { RoomMember } from 'matrix-js-sdk'
import { useMemo } from 'react'
import { useZionContext } from '../components/ZionContextProvider'

/**
 * Returns all members from all rooms
 */
export function useSpaceMembers() {
    const { client } = useZionContext()
    return useMemo(() => {
        const membersMap = new Map<string, RoomMember>()
        const rooms = client?.getRooms()
        rooms?.forEach((r) => {
            r.getMembers().forEach((m) => {
                if (m?.userId) {
                    membersMap.set(m.userId, m)
                }
            })
        }, membersMap) ?? membersMap
        return {
            members: Array.from(membersMap).map((m) => m[1]),
            membersMap,
        }
    }, [client])
}
