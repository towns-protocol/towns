import { useMemo } from 'react'
import { useAllKnownUsers } from './use-all-known-users'
import { User, RoomMember } from 'types/zion-types'

export function useUser(userId?: string): User | RoomMember | undefined {
    const { users } = useAllKnownUsers()
    return useMemo(
        () =>
            userId
                ? users.find((user) => user.userId === userId) ??
                  ({
                      userId: userId,
                      displayName: userId,
                      lastPresenceTs: 0,
                      currentlyActive: true,
                  } satisfies User)
                : undefined,
        [userId, users],
    )
}
