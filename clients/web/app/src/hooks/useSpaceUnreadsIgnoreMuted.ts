import { useSpaceId, useTownsContext } from 'use-towns-client'

export const useShowHasUnreadBadgeForSpaceId = (spaceId?: string) => {
    const { spaceUnreads } = useTownsContext()
    return spaceUnreads[spaceId ?? ''] ?? false
}

/**
 * This hook returns a general "has unread" status, while ignoring a specific space.
 * useful for displaying a badge for "do i have unreads in any spaces except this one?"
 */
export const useShowHasUnreadBadgeForOtherSpaces = (ignoredSpaceId?: string) => {
    const { spaceUnreads } = useTownsContext()

    return Object.entries(spaceUnreads).some(([spaceId, hasUnread]) => {
        return spaceId !== ignoredSpaceId && hasUnread
    })
}

// The hook for badging the active space is slightly different. We need access to the
// space's channels in order to pluck out the correct channels from the fullyReadMarkers.
export const useShowHasUnreadBadgeForCurrentSpace = () => {
    const spaceId = useSpaceId()
    const { spaceUnreads } = useTownsContext()
    const showHasUnreadBadgeForCurrentSpace = spaceUnreads[spaceId ?? ''] ?? false
    return { showHasUnreadBadgeForCurrentSpace }
}
