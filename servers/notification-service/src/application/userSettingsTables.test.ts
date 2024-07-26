import { UserSettingsTables } from './userSettingsTables'
import { database } from './prisma'
import { Mute } from './notificationSettingsSchema'

describe('userSettingsTables', () => {
    const users = ['user1', 'user2', 'user3']
    const SpaceId = 'spaceId'
    const ChannelId = 'channelId'
    const ChannelMute = Mute.Muted
    const BlockedUsers: string[] = []
    const expectedUserIds = [
        {
            UserId: 'user1',
            Mention: false,
            ReplyTo: false,
            DirectMessage: false,
            SpaceId,
            ChannelId,
            ChannelMute,
            BlockedUsers,
        },
        {
            UserId: 'user2',
            Mention: false,
            ReplyTo: false,
            DirectMessage: false,
            SpaceId,
            ChannelId,
            ChannelMute,
            BlockedUsers,
        },
        {
            UserId: 'user3',
            Mention: false,
            ReplyTo: false,
            DirectMessage: false,
            SpaceId,
            ChannelId,
            ChannelMute,
            BlockedUsers,
        },
    ]

    describe('getUserMutedInChannel', () => {
        test('should return an array of user IDs for users with ChannelMute set to muted', async () => {
            // Arrange
            const findManyMock = jest
                .spyOn(database.userSettingsChannel, 'findMany')
                .mockResolvedValue(expectedUserIds)

            // Act
            const result = await UserSettingsTables.getUserMutedInChannel(users, SpaceId, ChannelId)

            // Assert
            expect(findManyMock).toHaveBeenCalledWith({
                where: {
                    SpaceId,
                    ChannelId,
                    ChannelMute: Mute.Muted,
                    UserId: { in: users },
                },
                select: {
                    UserId: true,
                },
            })
            expect(result).toEqual(expectedUserIds)
        })
    })

    describe('getUserMutedInMention', () => {
        test('should return an array of user IDs for users with Mention set to false', async () => {
            // Arrange
            const findManyMock = jest
                .spyOn(database.userSettings, 'findMany')
                .mockResolvedValue(expectedUserIds)

            // Act
            const result = await UserSettingsTables.getUserMutedInMention(users)

            // Assert
            expect(findManyMock).toHaveBeenCalledWith({
                where: {
                    Mention: false,
                    UserId: { in: users },
                },
                select: {
                    UserId: true,
                },
            })
            expect(result).toEqual(expectedUserIds)
        })
    })

    describe('getUserMutedInReplyTo', () => {
        test('should return an array of user IDs for users with ReplyTo set to false', async () => {
            // Arrange
            const findManyMock = jest
                .spyOn(database.userSettings, 'findMany')
                .mockResolvedValue(expectedUserIds)

            // Act
            const result = await UserSettingsTables.getUserMutedInReplyTo(users)

            // Assert
            expect(findManyMock).toHaveBeenCalledWith({
                where: {
                    ReplyTo: false,
                    UserId: { in: users },
                },
                select: {
                    UserId: true,
                },
            })
            expect(result).toEqual(expectedUserIds)
        })
    })

    describe('getUserMutedInDirectMessage', () => {
        test('should return an array of user IDs for users with DirectMessage set to false', async () => {
            // Arrange
            const findManyMock = jest
                .spyOn(database.userSettings, 'findMany')
                .mockResolvedValue(expectedUserIds)

            // Act
            const result = await UserSettingsTables.getUserMutedInDirectMessage(users)

            // Assert
            expect(findManyMock).toHaveBeenCalledWith({
                where: {
                    DirectMessage: false,
                    UserId: { in: users },
                },
                select: {
                    UserId: true,
                },
            })
            expect(result).toEqual(expectedUserIds)
        })
    })

    describe('getBlockedUsersBy', () => {
        test('should return an array of blocked users for a given user ID', async () => {
            const BlockedUsers = ['blockedUser1', 'blockedUser2']
            // Mock the findMany method
            const findManyMock = jest.spyOn(database.userSettings, 'findMany').mockResolvedValue([
                {
                    UserId: 'userId',
                    BlockedUsers: BlockedUsers,
                    ReplyTo: true,
                    Mention: true,
                    DirectMessage: true,
                },
            ])
            const results = await UserSettingsTables.getBlockedUsersByUserIds(['userId'])

            expect(results.length).toBeGreaterThanOrEqual(1)
            const blockedUsers = results[0].blockedUsers

            expect(findManyMock).toHaveBeenCalledWith({
                where: {
                    UserId: {
                        in: ['userId'],
                    },
                },
                select: {
                    UserId: true,
                    BlockedUsers: true,
                },
            })
            expect(blockedUsers).toEqual(BlockedUsers)
        })

        test('should return an empty array if the user is not found', async () => {
            // Mock the findMany method
            const findManyMock = jest.spyOn(database.userSettings, 'findMany').mockResolvedValue([
                {
                    UserId: 'userId',
                    BlockedUsers: [],
                    ReplyTo: true,
                    Mention: true,
                    DirectMessage: true,
                },
            ])

            const results = await UserSettingsTables.getBlockedUsersByUserIds(['userId'])

            expect(findManyMock).toHaveBeenCalledWith({
                where: {
                    UserId: 'userId',
                },
                select: {
                    BlockedUsers: true,
                },
            })
            expect(results[0]?.blockedUsers).toEqual([])
        })
    })
})
