import { useMyUserId, useSpaceId, useUserLookupStore } from 'use-towns-client'

export const useUsernameConfirmed = () => {
    const userId = useMyUserId()
    const spaceId = useSpaceId()

    const usernameConfirmed = useUserLookupStore(({ spaceUsers }) =>
        spaceId && userId ? spaceUsers[spaceId]?.[userId]?.usernameConfirmed : undefined,
    )

    return (
        // prevent setting username while user isn't yet loaded
        usernameConfirmed ?? true
    )
}
