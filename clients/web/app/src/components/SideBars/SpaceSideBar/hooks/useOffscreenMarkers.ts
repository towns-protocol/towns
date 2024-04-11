import { useMemo } from 'react'
import { OffscreenMarker } from '@components/OffscreenPill/OffscreenPill'
import { ChannelMenuItem, MixedChannelMenuItem } from 'hooks/useSortedChannels'
import { notUndefined } from 'ui/utils/utils'

const isChannel = (c: MixedChannelMenuItem): c is ChannelMenuItem => c.type === 'channel'

/**
 * given a list of unread channels, threads and mentions, returns a list of markers
 */
export const useOffscreenMarkers = ({
    unreadChannels,
    unreadThreadsCount,
    unreadThreadMentions,
}: {
    unreadChannels: MixedChannelMenuItem[]
    unreadThreadsCount: number
    unreadThreadMentions: number
}) => {
    return useMemo(() => {
        let defaultMarker: OffscreenMarker | undefined = undefined
        const markers: string[] = []

        let count = unreadThreadMentions

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

        unreadChannels.forEach((c) => {
            if (isChannel(c)) {
                count += c.mentionCount
                markers.push(c.id)
                defaultMarker = {
                    targetId: defaultMarker?.targetId ?? c.id,
                    // keep topmost marker while adapting the label
                    label: count ? `Unread mentions` : defaultMarker?.label ?? 'More unread',
                }
            } else {
                markers.push(c.id)
                defaultMarker = {
                    targetId: defaultMarker?.targetId ?? c.id,
                    label: 'Unread messages',
                }
            }
        })

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
    }, [unreadChannels, unreadThreadMentions, unreadThreadsCount])
}
