import Dexie, { Table } from 'dexie'

export interface CurrentUserRecord {
    keyPath: string
    userId: string
    databaseName: string
}

export class NotificationCurrentUser extends Dexie {
    private static readonly keyPath = 'currentUser'
    public readonly storeName: string
    private currentUser!: Table<CurrentUserRecord>

    constructor() {
        const storeName = 'notification-current-user'
        super(storeName)
        this.storeName = storeName
        this.version(2).stores({
            currentUser: 'keyPath',
        })
    }

    public async getCurrentUserRecord(): Promise<CurrentUserRecord | undefined> {
        return this.currentUser.get(NotificationCurrentUser.keyPath)
    }

    public async setCurrentUserRecord(userId: string, databaseName: string): Promise<void> {
        await this.currentUser.put({
            keyPath: NotificationCurrentUser.keyPath,
            userId,
            databaseName,
        })
    }

    public async deleteCurrentUser(): Promise<void> {
        await this.currentUser.delete(NotificationCurrentUser.keyPath)
    }
}
