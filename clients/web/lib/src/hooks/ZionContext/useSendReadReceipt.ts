import { useCallback } from 'react'
import { FullyReadMarker } from '@river/proto'
import { useFullyReadMarkerStore } from '../../store/use-fully-read-marker-store'
import { ZionClient } from '../../client/ZionClient'
import { makeRoomIdentifier } from '../../types/room-identifier'

export function useSendReadReceipt(client: ZionClient | undefined) {
    return useCallback(
        async (marker: FullyReadMarker) => {
            if (!client) {
                throw new Error('No client')
            }
            console.log('useSendReadReceipt::marker', { marker })
            useFullyReadMarkerStore.setState((state) => {
                const markerId = marker.threadParentId ?? marker.channelId
                if (state.markers[markerId]?.isUnread === true) {
                    return {
                        ...state,
                        markers: {
                            ...state.markers,
                            [markerId]: {
                                ...state.markers[markerId],
                                isUnread: false,
                                beginUnreadWindow: state.markers[markerId].endUnreadWindow + 1n,
                                markedReadAtTs: BigInt(Date.now()),
                                mentions: 0,
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
                await client?.setRoomFullyReadData(
                    makeRoomIdentifier(marker.channelId),
                    channelMarkers,
                )
            } catch (e) {
                console.error('Failed to set room account data', e)
            }
        },

        [client],
    )
}
