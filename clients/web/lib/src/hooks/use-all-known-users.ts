import { useMemo, useRef } from 'react'
import { useZionContext } from '../components/ZionContextProvider'
import { RoomMember } from 'types/zion-types'
import isEqual from 'lodash/isEqual'
import { KnownUser, MemberOf } from '../types/user-lookup'

/**
 * @returns an array of all known users in all spaces.
 */

export function useAllKnownUsers() {
    const { spaces, rooms } = useZionContext()
    const knownUsersRef = useRef<{ [userId: string]: KnownUser }>({})

    const users = useMemo(() => {
        const spaceIds = spaces.map((space) => space.id)
        // The same user can be a member of multiple spaces.
        // The Map makes sure we only return 1 instance of each user.
        const users = new Map<string, KnownUser>()
        for (const spaceId of spaceIds) {
            const room = rooms[spaceId]
            if (room) {
                for (const member of room.members) {
                    const existingMember = users.get(member.userId)
                    const memberOf = existingMember?.memberOf ?? {}
                    memberOf[spaceId] = { spaceId, ...member }
                    users.set(member.userId, { ...member, memberOf })
                }
            }
        }
        const retVal = [...users.values()]
        // swap in existing users if they are the same to prevent needless rerenders
        for (let i = 0; i < retVal.length; i++) {
            const user = retVal[i]
            const existingUser = knownUsersRef.current[user.userId]
            if (existingUser && isEqual(existingUser, user)) {
                retVal[i] = existingUser
            } else {
                knownUsersRef.current[user.userId] = user
            }
        }
        return retVal
    }, [spaces, rooms])

    // in order to mimick useSpaceMembers
    const usersMap = useMemo(
        () =>
            users.reduce((acc, member) => {
                acc[member.userId] = member
                return acc
            }, {} as { [userId: string]: RoomMember & { memberOf: MemberOf } }),
        [users],
    )

    return useMemo(() => ({ users, usersMap }), [users, usersMap])
}
