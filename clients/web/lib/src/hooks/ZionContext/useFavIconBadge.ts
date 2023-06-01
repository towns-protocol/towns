import { useEffect, useMemo } from 'react'
import { RoomIdentifier } from '../../types/room-identifier'
import { Badger } from '../../utils/Badger'
import { useZionContext } from '../../components/ZionContextProvider'

declare const navigator: Navigator & {
    setAppBadge?: (count?: number) => void
    clearAppBadge?: () => void
}

const getBadgeCount = (
    invitedToIds: RoomIdentifier[],
    spaceUnreads: Record<string, boolean>,
    spaceMentions: Record<string, number>,
) => {
    const hasUnread =
        // all invites
        invitedToIds.length > 0 ||
        // all unreads in the space hierarchy
        Object.values(spaceUnreads).indexOf(true) >= 0

    // mentions
    const mentions = Object.values(spaceMentions).reduce((a, b) => a + b, 0)

    return { mentions, hasUnread } as const
}

export function useBadgeStatus() {
    const { invitedToIds, spaceUnreads, spaceMentions } = useZionContext()
    return useMemo(
        () => getBadgeCount(invitedToIds, spaceUnreads, spaceMentions),
        [invitedToIds, spaceMentions, spaceUnreads],
    )
}

export function useAppBadge(): void {
    const { hasUnread, mentions } = useBadgeStatus()
    useEffect(() => {
        if (
            typeof navigator?.setAppBadge === 'function' &&
            typeof navigator?.clearAppBadge === 'function'
        ) {
            if (mentions > 0) {
                navigator.setAppBadge?.(mentions)
            } else if (hasUnread) {
                navigator.setAppBadge?.()
            } else {
                navigator.clearAppBadge?.()
            }
        }
    }, [hasUnread, mentions])
}

export function useFavIconBadge(): void {
    const { hasUnread, mentions } = useBadgeStatus()
    useEffect(() => {
        // set the badge
        Badger.faviconSingleton().badge(mentions, hasUnread)
        // log
        console.log('calculated new badge value', { mentions, hasUnread })
        // end: useEffect
    }, [hasUnread, mentions])
}
