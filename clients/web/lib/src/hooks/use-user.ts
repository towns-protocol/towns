import { useMemo } from 'react'
import { LookupUser, useUserLookupContext } from '../components/UserLookupContext'

export function useUser(userId?: string): LookupUser | undefined {
    const { users } = useUserLookupContext()
    const defaultUser = useMemo(
        () =>
            userId
                ? ({
                      userId: userId,
                      username: userId,
                      usernameConfirmed: true,
                      usernameEncrypted: false,
                      displayName: userId,
                      displayNameEncrypted: false,
                  } satisfies LookupUser)
                : undefined,
        [userId],
    )

    return useMemo(
        () => users.find((user) => user.userId === userId) ?? defaultUser,
        [defaultUser, userId, users],
    )
}
