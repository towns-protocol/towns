import { useMembers } from './use-members'
import { useSpaceContext } from '../components/SpaceContextProvider'
import { useAllKnownUsers } from './use-all-known-users'
import { useMemo } from 'react'

/**
 * Returns all members from the space in the current space context
 */
export function useSpaceMembers() {
    const allUsers = useAllKnownUsers()
    const allMembers = useMemo(
        () => ({
            members: allUsers.users,
            membersMap: allUsers.usersMap,
        }),
        [allUsers.users, allUsers.usersMap],
    )
    const { spaceId } = useSpaceContext()
    const spaceMembers = useMembers(spaceId)
    return spaceId ? spaceMembers : allMembers
}
