import Dexie, { Table } from 'dexie'
import { ChannelRecord, DmChannelRecord, SpaceRecord, UserRecord } from './notificationSchema'

export class NotificationStore extends Dexie {
    public readonly storeName: string
    public readonly userId: string
    public spaces!: Table<SpaceRecord, string>
    public channels!: Table<ChannelRecord, string>
    public dmChannels!: Table<DmChannelRecord, string>
    public users!: Table<UserRecord, string>

    constructor(userId: string, storeName?: string) {
        storeName = storeName ?? `notification-${userId}`
        super(storeName)
        this.storeName = storeName
        this.userId = userId
        this.version(2).stores({
            spaces: 'id',
            channels: 'id, parentSpaceId',
            dmChannels: 'id, parentSpaceId',
            users: 'id',
        })
    }

    public async getUser(userId: string): Promise<UserRecord | undefined> {
        return await this.users.get(userId)
    }

    public async setUser(user: UserRecord): Promise<void> {
        await this.users.put(user, user.id)
    }

    public async getUsers(): Promise<UserRecord[]> {
        return this.users.toArray()
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

    public async getChannelsBySpaceId(spaceId: string): Promise<ChannelRecord[]> {
        return this.channels.where('parentSpaceId').equalsIgnoreCase(spaceId).toArray()
    }

    public async getDmChannel(channelId: string): Promise<DmChannelRecord | undefined> {
        return await this.dmChannels.get(channelId)
    }

    public async setDmChannel(channel: DmChannelRecord): Promise<void> {
        await this.dmChannels.put(channel, channel.id)
    }

    public async getDmChannelsByIds(
        channelIds: string[],
    ): Promise<(DmChannelRecord | undefined)[]> {
        return this.dmChannels.bulkGet(channelIds)
    }
}
