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
                if (marker.threadParentId) {
                    if (state.markers[marker.threadParentId]?.isUnread === true) {
                        return {
                            ...state,
                            markers: {
                                ...state.markers,
                                [marker.threadParentId]: {
                                    ...state.markers[marker.threadParentId],
                                    isUnread: false,
                                    markedReadAtTs: Date.now(),
                                },
                            },
                        }
                    } else {
                        return state
                    }
                } else if (state.markers[marker.channelId.matrixRoomId]?.isUnread === true) {
                    return {
                        ...state,
                        markers: {
                            ...state.markers,
                            [marker.channelId.matrixRoomId]: {
                                ...state.markers[marker.channelId.matrixRoomId],
                                isUnread: false,
                                markedReadAtTs: Date.now(),
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
        },
        [client],
    )
}
