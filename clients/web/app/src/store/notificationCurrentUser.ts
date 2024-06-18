import Dexie, { Table } from 'dexie'

export interface CurrentUser {
    userId: string
    databaseName: string
    notificationClickedTimestamp: number // timestamp of the notification clicked
    spaceId?: string // the spaceId extracted from the notificationUrl
    channelId?: string // the channelId extracted from the notificationUrl
    threadId?: string // the threadId extracted from the notificationUrl
    notificationUrl?: string // latest notification that the user clicked on, and wants to navigate to
    hasVisitedUrl?: boolean // has the user visited the url
}

export interface CurrentUserRecord extends CurrentUser {
    keyPath: string
}

export interface NotificationClicked {
    notificationUrl: string
    channelId?: string
    spaceId?: string
    threadId?: string
}

export class NotificationCurrentUser extends Dexie {
    private static readonly keyPath = 'currentUser'
    public readonly storeName: string
    public readonly currentUser!: Table<CurrentUserRecord>

    constructor() {
        const storeName = 'notification-current-user'
        super(storeName)
        this.storeName = storeName
        this.version(7).stores({
            currentUser: 'keyPath, notificationClickedTimestamp',
        })
    }

    public getCurrentUserRecord(): Promise<CurrentUserRecord | undefined> {
        return this.currentUser.get(NotificationCurrentUser.keyPath)
    }

    public setCurrentUserRecord(updatedRecord: CurrentUser): Promise<void> {
        return this.currentUser.put({
            keyPath: NotificationCurrentUser.keyPath,
            ...updatedRecord,
        })
    }

    public setNotificationClicked({
        notificationUrl: notificationUrl,
        channelId,
        threadId,
        spaceId,
    }: NotificationClicked): Promise<number> {
        const notificationClickedTimestamp = Date.now()
        return this.currentUser.update(NotificationCurrentUser.keyPath, {
            notificationUrl,
            notificationClickedTimestamp,
            channelId,
            threadId,
            spaceId,
            hasVisitedUrl: undefined,
        })
    }

    public deleteCurrentUser(): Promise<void> {
        return this.currentUser.delete(NotificationCurrentUser.keyPath)
    }

    public async getVisitedUrl(): Promise<boolean | undefined> {
        const cu = await this.currentUser.get(NotificationCurrentUser.keyPath)
        return cu?.hasVisitedUrl
    }

    public setVisitedUrl(hasVisitedUrl: boolean): Promise<number> {
        return this.currentUser.update(NotificationCurrentUser.keyPath, {
            hasVisitedUrl,
        })
    }
}

export function createCurrentUser() {
    return new NotificationCurrentUser()
}

export function deleteCurrentUser() {
    const currentUser = new NotificationCurrentUser()
    return currentUser.deleteCurrentUser()
}
