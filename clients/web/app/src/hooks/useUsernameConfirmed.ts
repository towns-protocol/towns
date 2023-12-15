import { useMyUserId, useUserLookupContext } from 'use-zion-client'
import { useMemo } from 'react'

export const useUsernameConfirmed = () => {
    const myUserId = useMyUserId()
    const { usersMap } = useUserLookupContext()

    const confirmed = useMemo(() => {
        if (!myUserId || !usersMap[myUserId]) {
            return true
        }
        return usersMap[myUserId].usernameConfirmed
    }, [myUserId, usersMap])

    return { confirmed }
}
