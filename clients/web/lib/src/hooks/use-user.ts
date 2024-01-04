import { useMemo } from 'react'
import { LookupUser } from '../types/user-lookup'
import { useUserLookupContext } from './use-user-lookup-context'

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
