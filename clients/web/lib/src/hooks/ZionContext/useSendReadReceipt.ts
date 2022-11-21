import { useCallback } from 'react'
import { useFullyReadMarkerStore } from '../../store/use-fully-read-marker-store'
import { ZionClient } from '../../client/ZionClient'
import { FullyReadMarker } from '../../types/timeline-types'

export function useSendReadReceipt(client: ZionClient | undefined) {
    return useCallback(
        async (marker: FullyReadMarker) => {
            if (!client) {
                throw new Error('No client')
            }
            console.log('useSendReadReceipt::marker', { marker })
            useFullyReadMarkerStore.setState((state) => {
                const markerId = marker.threadParentId ?? marker.channelId.matrixRoomId
                if (state.markers[markerId]?.isUnread === true) {
                    return {
                        ...state,
                        markers: {
                            ...state.markers,
                            [markerId]: {
                                ...state.markers[markerId],
                                isUnread: false,
                                markedReadAtTs: Date.now(),
                                mentions: 0,
                            },
                        },
                    }
                } else {
                    return state
                }
            })

            try {
                await client.sendReadReceipt(marker.channelId)
            } catch (e) {
                console.error('Failed to send read receipt', e)
            }

            const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
            const channelMarkers = Object.entries(
                useFullyReadMarkerStore.getState().markers,
            ).reduce((acc, [key, value]) => {
                if (value.channelId.matrixRoomId === marker.channelId.matrixRoomId) {
                    // aellis early attempt at pruning these values, don't bother storing markers
                    // that are older than 1 week if they're read
                    if (value.isUnread || value.markedReadAtTs > oneWeekAgo) {
                        acc[key] = value
                    }
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
