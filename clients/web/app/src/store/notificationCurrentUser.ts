import Dexie, { Table } from 'dexie'

interface CurrentUserRecord {
    keyPath: string
    userId: string
}

export class NotificationCurrentUser extends Dexie {
    private static readonly keyPath = 'currentUser'
    public readonly storeName: string
    private currentUser!: Table<CurrentUserRecord>

    constructor() {
        const storeName = 'notification-current-user'
        super(storeName)
        this.storeName = storeName
        this.version(1).stores({
            currentUser: 'keyPath',
        })
    }

    public async getCurrentUserId(): Promise<string | undefined> {
        return (await this.currentUser.get(NotificationCurrentUser.keyPath))?.userId
    }

    public async setCurrentUserId(userId: string): Promise<void> {
        await this.currentUser.put({
            keyPath: NotificationCurrentUser.keyPath,
            userId,
        })
    }

    public async deleteCurrentUser(): Promise<void> {
        await this.currentUser.delete(NotificationCurrentUser.keyPath)
    }
}
