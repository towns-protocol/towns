import Dexie, { Table } from 'dexie'
import { ChannelRecord, SpaceRecord, UserRecord } from './notificationSchema'

export class NotificationStore extends Dexie {
    private readonly dbName: string
    public spaces!: Table<SpaceRecord, string>
    public channels!: Table<ChannelRecord, string>
    public users!: Table<UserRecord, string>

    constructor(dbName?: string) {
        const _dbName = dbName ?? 'db_notification'
        super(_dbName)
        this.dbName = _dbName
        this.version(1).stores({
            spaces: 'id',
            channels: 'id, parentSpaceId',
            users: 'id',
        })
    }

    public get databaseName(): string {
        return this.dbName
    }

    public async getUser(userId: string): Promise<UserRecord | undefined> {
        return await this.users.get(userId)
    }

    public async setUser(user: UserRecord): Promise<void> {
        await this.users.put(user, user.id)
    }

    public async getSpace(spaceId: string): Promise<SpaceRecord | undefined> {
        return await this.spaces.get(spaceId)
    }

    public async setSpace(space: SpaceRecord): Promise<void> {
        await this.spaces.put(space, space.id)
    }

    public async getChannel(channelId: string): Promise<ChannelRecord | undefined> {
        return await this.channels.get(channelId)
    }

    public async setChannel(channel: ChannelRecord): Promise<void> {
        await this.channels.put(channel, channel.id)
    }

    public async getChannels(spaceId: string): Promise<ChannelRecord[]> {
        return this.channels.where('parentSpaceId').equalsIgnoreCase(spaceId).toArray()
    }

    public async getUsers(): Promise<UserRecord[]> {
        return this.users.toArray()
    }
}
