import { IRooms, ISyncResponse, MemoryStore } from 'matrix-js-sdk'

export interface IUnreadNotificationCounts {
    highlight_count?: number
    notification_count?: number
}

interface IExtendedRooms extends IRooms {
    ['unread_notifications']: Record<string, IUnreadNotificationCounts>
}

/***************************************
 * CustomMemoryStore was originally created to solve a single problem
 * - the matrix js sdk doesn't dispatch an event after it updates unread counts
 * - it does dispatch an event after each sync
 * - it does not provide a way to get the raw sync data
 * - this class holds on to the last sync data so that we can retrieve it after the sync event
 ***************************************/
export class CustomMemoryStore extends MemoryStore {
    lastSyncData?: ISyncResponse

    public setSyncData(syncData: ISyncResponse): Promise<void> {
        this.lastSyncData = syncData
        return super.setSyncData(syncData)
    }

    public getLastUnreadNotificationCounts():
        | Record<string, IUnreadNotificationCounts>
        | undefined {
        if (!this.lastSyncData?.rooms) {
            return {}
        }
        if ((this.lastSyncData.rooms as IExtendedRooms).unread_notifications) {
            return (this.lastSyncData.rooms as IExtendedRooms).unread_notifications
        }
        return undefined
    }
}
