import Dexie, { Table } from 'dexie'

export interface CurrentUser {
    userId: string
    databaseName: string
    lastUrl?: string
    lastUrlTimestamp?: number
}

export interface CurrentUserRecord extends CurrentUser {
    keyPath: string
}

export class NotificationCurrentUser extends Dexie {
    private static readonly keyPath = 'currentUser'
    public readonly storeName: string
    public readonly currentUser!: Table<CurrentUserRecord>

    constructor() {
        const storeName = 'notification-current-user'
        super(storeName)
        this.storeName = storeName
        this.version(4).stores({
            currentUser: 'keyPath, lastUrlTimestamp',
        })
    }

    public async getCurrentUserRecord(): Promise<CurrentUserRecord | undefined> {
        return this.currentUser.get(NotificationCurrentUser.keyPath)
    }

    public async setCurrentUserRecord(updatedRecord: CurrentUser): Promise<void> {
        await this.currentUser.put({
            keyPath: NotificationCurrentUser.keyPath,
            ...updatedRecord,
        })
    }

    public async setLastUrl(url: string): Promise<void> {
        const lastUrlTimestamp = Date.now()
        await this.currentUser.update(NotificationCurrentUser.keyPath, {
            lastUrl: url,
            lastUrlTimestamp,
        })
    }

    public async deleteCurrentUser(): Promise<void> {
        return this.currentUser.delete(NotificationCurrentUser.keyPath)
    }
}
