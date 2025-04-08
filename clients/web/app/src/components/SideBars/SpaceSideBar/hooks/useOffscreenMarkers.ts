import { useMemo } from 'react'
import { OffscreenMarker } from '@components/OffscreenPill/OffscreenPill'
import { ChannelMenuItem, MixedChannelMenuItem } from 'hooks/useSortedChannels'

const isChannel = (c: MixedChannelMenuItem): c is ChannelMenuItem => c.type === 'channel'

const Priority = {
    DM: 2,
    Mention: 1,
    Message: 0,
} as const

/**
 * given a list of unread channels, threads and mentions, returns a list of markers
 */
export const useOffscreenMarkers = ({
    unreads,
    unreadThreadsCount,
    unreadThreadMentions,
}: {
    unreads: MixedChannelMenuItem[]
    unreadThreadsCount: number
    unreadThreadMentions: number
}) => {
    return useMemo(() => {
        const markers: OffscreenMarker[] = []

        unreads.forEach((c) => {
            if (isChannel(c)) {
                markers.push({
                    targetId: c.id,
                    label: c.mentionCount ? 'Unread mentions' : 'More unread',
                    priority: c.mentionCount ? Priority.Mention : Priority.Message,
                })
            } else {
                markers.push({
                    targetId: c.id,
                    label: 'Unread messages',
                    priority: Priority.DM,
                })
            }
        })

        // unread threads are top most
        if (unreadThreadMentions > 0) {
            markers.push({
                targetId: 'threads',
                label: 'Unread mentions',
                priority: Priority.Mention,
            })
        } else if (unreadThreadsCount > 0) {
            markers.push({
                targetId: 'threads',
                label: 'More unread',
                priority: Priority.Message,
            })
        }

        return {
            markers: markers.filter((m) => !!m?.targetId),
        }
    }, [unreads, unreadThreadMentions, unreadThreadsCount])
}
