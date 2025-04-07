import { useMemo } from 'react'
import { OffscreenMarker } from '@components/OffscreenPill/OffscreenPill'
import { notUndefined } from 'ui/utils/utils'

/**
 * given a list of unread channels, threads and mentions, returns a list of markers
 */
export const useOffscreenMarkers = ({
    unreadThreadsCount,
    unreadThreadMentions,
}: {
    unreadThreadsCount: number
    unreadThreadMentions: number
}) => {
    return useMemo(() => {
        let defaultMarker: OffscreenMarker | undefined = undefined
        const markers: string[] = []

        if (unreadThreadsCount > 0) {
            markers.push('threads')
            defaultMarker = {
                targetId: 'threads',
                label: `More unread`,
            }
        }

        // unread threads are top most
        if (unreadThreadMentions > 0) {
            defaultMarker = {
                targetId: 'threads',
                label: `Unread mentions`,
            }
            markers.push('threads')
        }

        if (unreadThreadsCount > 0) {
            defaultMarker = {
                targetId: 'threads',
                // since threads are on top, we still want to show the pill
                // until the user scrolls past the first thread however we keep
                // the precedence for the label (e.g. Unread mentions first)
                label: defaultMarker?.label ?? `More unread`,
            }
        }

        return {
            defaultLabel: defaultMarker?.label,
            // we only use one default label (e.g. Unread mentions) for all markers
            // independently of what's outside of the screen or not otherwise
            // the pill changes shape / content too often as you scroll
            markers: markers
                .map((m) => ({
                    targetId: m,
                }))
                .filter(notUndefined),
        }
    }, [unreadThreadMentions, unreadThreadsCount])
}
