import { useCallback } from 'react'
import { FullyReadMarker } from '@river-build/proto'
import { useFullyReadMarkerStore } from '../../store/use-fully-read-marker-store'
import { TownsClient } from '../../client/TownsClient'

export function useSendReadReceipt(client: TownsClient | undefined) {
    return useCallback(
        async (marker: FullyReadMarker, isUnread = false) => {
            if (!client) {
                throw new Error('No client')
            }

            useFullyReadMarkerStore.setState((state) => {
                const markerId = marker.threadParentId ?? marker.channelId

                const { mentions: inMentions } = marker
                const mentions = !isUnread ? 0 : inMentions ?? 0

                if (isUnread || state.markers[markerId]?.isUnread === true) {
                    return {
                        ...state,
                        markers: {
                            ...state.markers,
                            [markerId]: {
                                ...state.markers[markerId],
                                isUnread,
                                eventId: marker.eventId,
                                eventNum: marker.eventNum,
                                beginUnreadWindow: isUnread
                                    ? marker.eventNum
                                    : state.markers[markerId].endUnreadWindow + 1n,
                                markedReadAtTs: isUnread ? 0n : BigInt(Date.now()),
                                mentions,
                            } satisfies FullyReadMarker,
                        },
                    }
                } else {
                    return state
                }
            })

            const channelMarkers = Object.entries(
                useFullyReadMarkerStore.getState().markers,
            ).reduce((acc, [key, value]) => {
                if (value.channelId === marker.channelId) {
                    acc[key] = value
                }
                return acc
            }, {} as Record<string, FullyReadMarker>)

            try {
                await client?.setRoomFullyReadData(marker.channelId, channelMarkers)
            } catch (e) {
                console.error('Failed to set room account data', e)
            }
        },
        [client],
    )
}
