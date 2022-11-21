import { useEffect } from 'react'
import { Badger } from '../../utils/Badger'

export function useFavIconBadge(
    invitedToIds: string[],
    spaceUnreads: Record<string, boolean>,
    spaceMentions: Record<string, number>,
): void {
    useEffect(() => {
        const hasUnread =
            // all invites
            invitedToIds.length > 0 ||
            // all unreads in the space hierarchy
            Object.values(spaceUnreads).indexOf(true) >= 0
        // mentions
        const mentions = Object.values(spaceMentions).reduce((a, b) => a + b, 0)
        // set the badge
        Badger.faviconSingleton().badge(mentions, hasUnread)
        // log
        console.log('calculated new badge value', { mentions, hasUnread })

        // end: useEffect
    }, [invitedToIds, spaceMentions, spaceUnreads])
}
