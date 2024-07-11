import { UserInfo } from '@river-build/sdk'
import { useEffect, useRef } from 'react'
import { useMyUserId, useSpaceId, useTownsContext, useUserLookupStore } from 'use-towns-client'

export const useUsernameConfirmed = () => {
    const userId = useMyUserId()
    const spaceId = useSpaceId()
    const { casablancaClient } = useTownsContext()

    const usernameConfirmed = useUserLookupStore(({ spaceUsers }) =>
        spaceId && userId ? spaceUsers[spaceId]?.[userId]?.usernameConfirmed : undefined,
    )

    // ----------------- logging -----------------

    const user = useUserLookupStore(({ spaceUsers }) =>
        spaceId && userId ? spaceUsers[spaceId]?.[userId] : undefined,
    )

    const usernameConfirmedFromStreamRef = useRef<UserInfo | undefined>()

    usernameConfirmedFromStreamRef.current =
        spaceId && userId
            ? casablancaClient?.streams.get(spaceId)?.view.getUserMetadata()?.userInfo(userId)
            : undefined

    useEffect(() => {
        console.log('useUsernameConfirmed', {
            spaceId,
            userId,
            usernameConfirmed,
            usernameConfirmedFromStream: usernameConfirmedFromStreamRef.current?.usernameConfirmed,
            userFromLookup: user,
            userFromStream: usernameConfirmedFromStreamRef.current,
        })
    }, [spaceId, user, userId, usernameConfirmed])

    // ----------------- logging -----------------

    return (
        // prevent setting username while user isn't yet loaded
        usernameConfirmed ?? true
    )
}
