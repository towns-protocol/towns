import { Mute } from './notificationSettingsSchema'
import { database } from './prisma'

export class UserSettingsTables {
    public static async getUserMutedInChannel(
        users: string[],
        spaceId: string,
        channelId: string,
    ): Promise<{ UserId: string }[]> {
        return await database.userSettingsChannel.findMany({
            where: {
                SpaceId: spaceId,
                ChannelId: channelId,
                ChannelMute: Mute.Muted,
                UserId: { in: users },
            },
            select: {
                UserId: true,
            },
        })
    }

    public static async getUserMutedInMention(users: string[]): Promise<{ UserId: string }[]> {
        return await database.userSettings.findMany({
            where: {
                Mention: false,
                UserId: { in: users },
            },
            select: {
                UserId: true,
            },
        })
    }

    public static async getUserMutedInReplyTo(users: string[]): Promise<{ UserId: string }[]> {
        return await database.userSettings.findMany({
            where: {
                ReplyTo: false,
                UserId: { in: users },
            },
            select: {
                UserId: true,
            },
        })
    }

    public static async getUserMutedInDirectMessage(
        users: string[],
    ): Promise<{ UserId: string }[]> {
        return await database.userSettings.findMany({
            where: {
                DirectMessage: false,
                UserId: { in: users },
            },
            select: {
                UserId: true,
            },
        })
    }

    public static async getBlockedUsersByUserIds(
        userIds: string[],
    ): Promise<{ userId: string; blockedUsers: string[] }[]> {
        const userSettings = await database.userSettings.findMany({
            where: {
                UserId: {
                    in: userIds,
                },
            },
            select: {
                UserId: true,
                BlockedUsers: true,
            },
        })

        return userSettings.map((setting) => ({
            userId: setting.UserId,
            blockedUsers: setting.BlockedUsers,
        }))
    }
}
