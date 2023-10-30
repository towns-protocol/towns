import { Client as CasablancaClient } from '@river/sdk'
import { useEffect, useState } from 'react'
import { DMChannelIdentifier } from 'types/dm-channel-identifier'
import { useFullyReadMarkerStore } from '../../store/use-fully-read-marker-store'
import isEqual from 'lodash/isEqual'

export function useDMUnreads(
    casablancaClient: CasablancaClient | undefined,
    dmIds: DMChannelIdentifier[],
): { dmUnreadChannelIds: Set<string> } {
    const [state, setState] = useState<{
        dmUnreadChannelIds: Set<string>
    }>({ dmUnreadChannelIds: new Set() })

    useEffect(() => {
        if (!casablancaClient) {
            return
        }

        const updateUnread = () => {
            const unreadChannelIds = new Set<string>()
            const markers = useFullyReadMarkerStore.getState().markers
            const channelIds = new Set([...dmIds.map((dm) => dm.id.networkId)])

            Object.values(markers).forEach((marker) => {
                if (marker.isUnread && channelIds.has(marker.channelId)) {
                    unreadChannelIds.add(marker.channelId)
                }
            })

            setState((prev) => {
                if (isEqual(prev.dmUnreadChannelIds, unreadChannelIds)) {
                    return prev
                }
                return { dmUnreadChannelIds: unreadChannelIds }
            })
        }

        updateUnread()

        const unsubscribe = useFullyReadMarkerStore.subscribe(updateUnread)
        return () => {
            unsubscribe()
        }
    }, [casablancaClient, setState, dmIds])
    return state
}
