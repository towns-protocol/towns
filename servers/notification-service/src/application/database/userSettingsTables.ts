import { Mute } from '@prisma/client'
import { database } from '../../infrastructure/database/prisma'

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
                ChannelMute: Mute.muted,
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
}
