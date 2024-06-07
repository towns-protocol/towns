import { useMyUserId, useUserLookupContext } from 'use-towns-client'
import { useMemo } from 'react'

export const useUsernameConfirmed = () => {
    const myUserId = useMyUserId()
    const { lookupUser } = useUserLookupContext()

    return useMemo(() => {
        if (!myUserId || !lookupUser(myUserId)) {
            return { confirmed: true }
        }
        return { confirmed: lookupUser(myUserId)?.usernameConfirmed }
    }, [lookupUser, myUserId])
}
