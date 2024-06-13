import { useMemo } from 'react'
import { useMyUserId } from './use-my-user-id'
import { useMemberOf } from './use-member-of'

// all my usernames from all joined spaces
export const useMyDefaultUsernames = (): string[] => {
    const userId = useMyUserId()
    const memberOf = useMemberOf(userId)

    return useMemo(
        () =>
            Object.values(memberOf ?? {})
                .map((space) => space.username.trim())
                .filter((username) => username !== ''),
        [memberOf],
    )
}
