import { useMemo } from 'react'
import { RoomMember } from 'types/zion-types'
import { useUserLookupContext } from '../components/UserLookupContext'

export function useUser(userId?: string): RoomMember | undefined {
    const { users } = useUserLookupContext()
    return useMemo(
        () =>
            userId
                ? users.find((user) => user.userId === userId) ??
                  ({
                      userId: userId,
                      username: userId,
                      usernameConfirmed: true,
                      displayName: userId,
                  } satisfies RoomMember)
                : undefined,
        [userId, users],
    )
}
