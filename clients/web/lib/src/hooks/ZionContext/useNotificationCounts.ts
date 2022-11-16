import { useEffect, useState } from 'react'
import { ClientEvent, NotificationCountType } from 'matrix-js-sdk'
import { ISyncStateData, SyncState } from 'matrix-js-sdk/lib/sync'
import { ZionClient } from '../../client/ZionClient'
import { IUnreadNotificationCounts } from 'client/store/CustomMatrixStore'

/// this all breaks when we turn on encryption, should be moved the the
/// content aware timeline parser
export function useNotificationCounts(client: ZionClient | undefined) {
    const [mentionCounts, setMentionCounts] = useState<Record<string, number>>({})

    useEffect(() => {
        if (!client) {
            return
        }
        console.log('USE UNREAD COUNTS EFFECT::init')

        const handleMentionCounts = (channelId: string, count: number) => {
            setMentionCounts((prev) => {
                if (prev[channelId] === count) {
                    return prev
                }
                return {
                    ...prev,
                    [channelId]: count,
                }
            })
        }

        const handleSyncEvent = (
            unreadNotificationsMap?: Record<string, IUnreadNotificationCounts>,
        ) => {
            if (!unreadNotificationsMap) {
                return
            }
            Object.entries(unreadNotificationsMap).forEach(([roomId, unread_notifications]) => {
                if (unread_notifications.highlight_count !== undefined) {
                    handleMentionCounts(roomId, unread_notifications.highlight_count)
                }
            })
        }

        // backfill
        client.getRooms().forEach((room) => {
            const highlightCount = room.getUnreadNotificationCount(NotificationCountType.Highlight)
            if (highlightCount) {
                handleMentionCounts(room.roomId, highlightCount)
            }
        })
        // caputre first sync
        handleSyncEvent(client.store.getLastUnreadNotificationCounts())

        // listen for sync events
        const onSync = (state: SyncState, _lastState?: SyncState, _data?: ISyncStateData) => {
            // console.log("!!!sync event", state);
            // grab the last sync data from the store
            if (state === SyncState.Syncing) {
                handleSyncEvent(client.store.getLastUnreadNotificationCounts())
            }
        }

        client.on(ClientEvent.Sync, onSync)
        return () => {
            client.off(ClientEvent.Sync, onSync)
        }
    }, [client])

    return { mentionCounts }
}
