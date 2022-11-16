import { useEffect } from 'react'
import { Badger } from '../../utils/Badger'

export function useFavIconBadge(invitedToIds: string[], spaceUnreads: Record<string, boolean>) {
    useEffect(() => {
        const value =
            // all invites
            invitedToIds.length > 0 ||
            // all unreads in the space hierarchy
            Object.values(spaceUnreads).indexOf(true) >= 0
        // set the badge
        Badger.faviconSingleton().dot(value)
        // log
        console.log('calculated new badge value', { value, spaceUnreads })

        // end: useEffect
    }, [invitedToIds, spaceUnreads])
}
