import { useCallback } from 'react'
import { useTownsContext } from 'use-towns-client'

export const useBlockedUsers = () => {
    const { blockedUserIds } = useTownsContext()

    return useCallback(
        (userId: string | undefined) => {
            if (userId === undefined) {
                return false
            }
            return blockedUserIds.has(userId)
        },
        [blockedUserIds],
    )
}
