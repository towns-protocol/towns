import { useMyUserId, useUserLookupContext } from 'use-towns-client'
import { useMemo } from 'react'

export const useUsernameConfirmed = () => {
    const myUserId = useMyUserId()
    const { usersMap } = useUserLookupContext()

    return useMemo(() => {
        if (!myUserId || !usersMap[myUserId]) {
            return { confirmed: true }
        }
        return { confirmed: usersMap[myUserId].usernameConfirmed }
    }, [myUserId, usersMap])
}
