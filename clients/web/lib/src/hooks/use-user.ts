import { useMemo } from 'react'
import { LookupUser, useUserLookupContext } from '../components/UserLookupContext'

export function useUser(userId?: string): LookupUser | undefined {
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
                  } satisfies LookupUser)
                : undefined,
        [userId, users],
    )
}
