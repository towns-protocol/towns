import { useEffect, useMemo } from 'react'
import { Badger } from '../../utils/Badger'
import { useTownsContext } from '../../components/TownsContextProvider'

declare const navigator: Navigator & {
    setAppBadge?: (count?: number) => void
    clearAppBadge?: () => void
}

const getBadgeCount = (
    invitedToIds: string[],
    spaceUnreads: Record<string, boolean>,
    spaceMentions: Record<string, number | undefined>,
    dmUnreadChannelIds: Set<string>,
) => {
    const hasUnread =
        // all invites
        invitedToIds.length > 0 ||
        // all unreads in the space hierarchy
        Object.values(spaceUnreads).indexOf(true) >= 0 ||
        // all unreads in the dm channels
        dmUnreadChannelIds.size > 0

    // mentions
    const mentions = Object.values(spaceMentions).reduce((a, b) => (a ?? 0) + (b ?? 0), 0)

    return { mentions, hasUnread } as const
}

export function useBadgeStatus() {
    const { spaceUnreads, spaceMentions, dmUnreadChannelIds } = useTownsContext()
    return useMemo(
        () => getBadgeCount([], spaceUnreads, spaceMentions, dmUnreadChannelIds),
        [spaceMentions, spaceUnreads, dmUnreadChannelIds],
    )
}

export function useAppBadge(): void {
    const { hasUnread, mentions } = useBadgeStatus()
    useEffect(() => {
        void (async () => {
            if (
                typeof navigator?.setAppBadge === 'function' &&
                typeof navigator?.clearAppBadge === 'function'
            ) {
                if (mentions ?? 0 > 0) {
                    await navigator.setAppBadge?.(mentions)
                } else if (hasUnread) {
                    await navigator.setAppBadge?.()
                } else {
                    await navigator.clearAppBadge?.()
                }
            }
        })()
    }, [hasUnread, mentions])
}

export function useFavIconBadge(): void {
    const { hasUnread, mentions } = useBadgeStatus()
    useEffect(() => {
        // set the badge
        Badger.faviconSingleton().badge(mentions ?? 0, hasUnread)
        // log
        console.log('calculated new badge value', { mentions, hasUnread })
        // end: useEffect
    }, [hasUnread, mentions])
}
