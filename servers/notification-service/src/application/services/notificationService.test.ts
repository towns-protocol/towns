import './../utils/envs.mock'

import { SendPushResponse, SendPushStatus } from './web-push/web-push-types'

import { NotificationService, NotifyUser } from './notificationService'
import { NotifyUsersSchema } from '../../types'
import { PushSubscription } from '@prisma/client'
import { UserSettingsTables } from '../database/userSettingsTables'
import { database } from '../../infrastructure/database/prisma'
import { NotificationAttachmentKind, NotificationKind } from '../schema/tagSchema'
import { PushType } from '../schema/subscriptionSchema'
import { sendNotificationViaWebPush } from './web-push/send-notification'
import { StreamPrefix } from './stream/id'

jest.mock('../../infrastructure/database/prisma', () => ({
    database: {
        userSettings: {
            findMany: jest.fn(),
        },
        userSettingsChannel: {
            findMany: jest.fn(),
        },
        pushSubscription: {
            findMany: jest.fn(),
            delete: jest.fn(),
        },
    },
}))

jest.mock('./web-push/send-notification', () => ({
    sendNotificationViaWebPush: jest.fn(),
}))

describe('NotificationService', () => {
    let notificationService: NotificationService
    let getMutedMentionUsersMock: jest.SpyInstance
    let getMutedReplyToUsersMock: jest.SpyInstance
    let getMutedDirectMessageUsersMock: jest.SpyInstance
    let getMutedUsersInChannelMock: jest.SpyInstance

    beforeEach(() => {
        notificationService = new NotificationService()

        getMutedMentionUsersMock = jest.spyOn(UserSettingsTables, 'getUserMutedInMention')
        getMutedReplyToUsersMock = jest.spyOn(UserSettingsTables, 'getUserMutedInReplyTo')
        getMutedDirectMessageUsersMock = jest.spyOn(
            UserSettingsTables,
            'getUserMutedInDirectMessage',
        )
        getMutedUsersInChannelMock = jest.spyOn(UserSettingsTables, 'getUserMutedInChannel')

        getMutedMentionUsersMock.mockResolvedValue([])
        getMutedReplyToUsersMock.mockResolvedValue([])
        getMutedDirectMessageUsersMock.mockResolvedValue([])
        getMutedUsersInChannelMock.mockResolvedValue([])
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('getUsersToNotify', () => {
        describe('Tag: Mention', () => {
            const setupMockData = () => {
                return {
                    notificationData: {
                        users: ['user1', 'user2', 'user3'],
                        payload: {
                            content: {
                                kind: NotificationKind.NewMessage,
                                spaceId: 'space123',
                                channelId: 'channel123',
                                senderId: 'user4',
                            },
                        },
                        sender: 'user4',
                    } as NotifyUsersSchema,
                    channelId: 'channel123',
                    taggedUsers: [
                        {
                            UserId: 'user1',
                            Tag: NotificationKind.Mention,
                            SpaceId: 'space123',
                            ChannelId: 'channel123',
                        },
                        {
                            UserId: 'user2',
                            Tag: NotificationKind.Mention,
                            SpaceId: 'space123',
                            ChannelId: 'channel123',
                        },
                        {
                            UserId: 'user3',
                            Tag: NotificationKind.Mention,
                            SpaceId: 'space123',
                            ChannelId: 'channel123',
                        },
                    ],
                }
            }

            it('should return the list of recipients to notify', async () => {
                const { notificationData, channelId, taggedUsers } = setupMockData()

                const result = await notificationService.getUsersToNotify(
                    notificationData,
                    channelId,
                    taggedUsers,
                )

                const expected: NotifyUser[] = []
                expected.push({ userId: 'user1', kind: NotificationKind.Mention })
                expected.push({ userId: 'user2', kind: NotificationKind.Mention })
                expected.push({ userId: 'user3', kind: NotificationKind.Mention })
                expect(result).toEqual(expected)
                expect(getMutedMentionUsersMock).toHaveBeenCalledWith(
                    expect.arrayContaining(['user1', 'user2', 'user3']),
                )
            })

            it('should return the list of recipients to notify excluding user2, who is not tagged', async () => {
                const { notificationData, channelId, taggedUsers } = setupMockData()

                const result = await notificationService.getUsersToNotify(
                    notificationData,
                    channelId,
                    taggedUsers.filter((user) => user.UserId !== 'user2'),
                )

                const expected: NotifyUser[] = []
                expected.push({ userId: 'user1', kind: NotificationKind.Mention })
                expected.push({ userId: 'user3', kind: NotificationKind.Mention })
                expect(result).toEqual(expected)
                expect(getMutedMentionUsersMock).toHaveBeenCalledWith(
                    expect.arrayContaining(['user1', 'user3']),
                )
            })

            it('should return the list of recipients to notify even user2, who is tagged in ReplyTo instead of Mention', async () => {
                const { notificationData, channelId, taggedUsers } = setupMockData()

                const result = await notificationService.getUsersToNotify(
                    notificationData,
                    channelId,
                    taggedUsers.map((user) => {
                        if (user.UserId === 'user2') {
                            user.Tag = NotificationKind.ReplyTo
                        }
                        return user
                    }),
                )

                const expected: NotifyUser[] = []
                expected.push({ userId: 'user1', kind: NotificationKind.Mention })
                expected.push({ userId: 'user2', kind: NotificationKind.ReplyTo })
                expected.push({ userId: 'user3', kind: NotificationKind.Mention })
                expect(result).toEqual(expected)
                expect(getMutedMentionUsersMock).toHaveBeenCalledWith(
                    expect.arrayContaining(['user1', 'user3']),
                )
            })

            it('should return the list of recipients to notify excluding user1 and user3 who are in mutedUsersInChannel', async () => {
                const { notificationData, channelId, taggedUsers } = setupMockData()

                getMutedUsersInChannelMock.mockResolvedValue([
                    { UserId: 'user1' },
                    { UserId: 'user3' },
                ])

                const result = await notificationService.getUsersToNotify(
                    notificationData,
                    channelId,
                    taggedUsers,
                )

                const expected: NotifyUser[] = []
                expected.push({ userId: 'user2', kind: NotificationKind.Mention })
                expect(result).toEqual(expected)
                expect(getMutedMentionUsersMock).toHaveBeenCalledWith(
                    expect.arrayContaining(['user2']),
                )
            })

            it('should return the list of recipients to notify excluding user1 who is in mutedMentionUsers', async () => {
                const { notificationData, channelId, taggedUsers } = setupMockData()
                getMutedMentionUsersMock.mockResolvedValue([{ UserId: 'user1' }])

                const result = await notificationService.getUsersToNotify(
                    notificationData,
                    channelId,
                    taggedUsers,
                )

                const expected: NotifyUser[] = []
                expected.push({ userId: 'user2', kind: NotificationKind.Mention })
                expected.push({ userId: 'user3', kind: NotificationKind.Mention })
                expect(result).toEqual(expected)
                expect(getMutedMentionUsersMock).toHaveBeenCalledWith(
                    expect.arrayContaining(['user2', 'user3']),
                )
            })

            it('should return the list of recipients to notify even though all user are in mutedReplyToUsers', async () => {
                const { notificationData, channelId, taggedUsers } = setupMockData()
                getMutedReplyToUsersMock.mockResolvedValue([
                    { UserId: 'user1' },
                    { UserId: 'user2' },
                    { UserId: 'user3' },
                ])

                const result = await notificationService.getUsersToNotify(
                    notificationData,
                    channelId,
                    taggedUsers,
                )

                const expected: NotifyUser[] = []
                expected.push({ userId: 'user1', kind: NotificationKind.Mention })
                expected.push({ userId: 'user2', kind: NotificationKind.Mention })
                expected.push({ userId: 'user3', kind: NotificationKind.Mention })
                expect(result).toEqual(expected)
                expect(getMutedMentionUsersMock).toHaveBeenCalledWith(
                    expect.arrayContaining(['user1', 'user2', 'user3']),
                )
            })
        })

        describe('Tag: ReplyTo', () => {
            const setupMockData = () => {
                return {
                    notificationData: {
                        users: ['user1', 'user2', 'user3'],
                        payload: {
                            content: {
                                kind: NotificationKind.ReplyTo,
                                spaceId: 'space123',
                                channelId: 'channel123',
                                senderId: 'user4',
                            },
                        },
                        sender: 'user4',
                    } as NotifyUsersSchema,
                    channelId: 'channel123',
                    taggedUsers: [
                        {
                            UserId: 'user1',
                            Tag: NotificationKind.ReplyTo.toString(),
                            SpaceId: 'space123',
                            ChannelId: 'channel123',
                        },
                        {
                            UserId: 'user2',
                            Tag: NotificationKind.ReplyTo.toString(),
                            SpaceId: 'space123',
                            ChannelId: 'channel123',
                        },
                        {
                            UserId: 'user3',
                            Tag: NotificationKind.ReplyTo.toString(),
                            SpaceId: 'space123',
                            ChannelId: 'channel123',
                        },
                    ],
                }
            }

            it('should return the list of recipients to notify', async () => {
                const { notificationData, channelId, taggedUsers } = setupMockData()

                const result = await notificationService.getUsersToNotify(
                    notificationData,
                    channelId,
                    taggedUsers,
                )
                const expected: NotifyUser[] = []
                expected.push({ userId: 'user1', kind: NotificationKind.ReplyTo })
                expected.push({ userId: 'user2', kind: NotificationKind.ReplyTo })
                expected.push({ userId: 'user3', kind: NotificationKind.ReplyTo })
                expect(result).toEqual(expected)
                expect(getMutedReplyToUsersMock).toHaveBeenCalledWith(
                    expect.arrayContaining(['user1', 'user2', 'user3']),
                )
            })

            it('should return the list of recipients to notify excluding user2, who is not tagged', async () => {
                const { notificationData, channelId, taggedUsers } = setupMockData()

                const result = await notificationService.getUsersToNotify(
                    notificationData,
                    channelId,
                    taggedUsers.filter((user) => user.UserId !== 'user2'),
                )

                const expected: NotifyUser[] = []
                expected.push({ userId: 'user1', kind: NotificationKind.ReplyTo })
                expected.push({ userId: 'user3', kind: NotificationKind.ReplyTo })
                expect(result).toEqual(expected)
                expect(getMutedReplyToUsersMock).toHaveBeenCalledWith(
                    expect.arrayContaining(['user1', 'user3']),
                )
            })

            it('should return the list of recipients to notify even user2, who is tagged in Mention instead of ReplyTo', async () => {
                const { notificationData, channelId, taggedUsers } = setupMockData()

                const result = await notificationService.getUsersToNotify(
                    notificationData,
                    channelId,
                    taggedUsers.map((user) => {
                        if (user.UserId === 'user2') {
                            user.Tag = NotificationKind.Mention
                        }
                        return user
                    }),
                )

                const expected: NotifyUser[] = []
                expected.push({ userId: 'user1', kind: NotificationKind.ReplyTo })
                expected.push({ userId: 'user2', kind: NotificationKind.Mention })
                expected.push({ userId: 'user3', kind: NotificationKind.ReplyTo })
                expect(result).toEqual(expected)
                expect(getMutedReplyToUsersMock).toHaveBeenCalledWith(
                    expect.arrayContaining(['user1', 'user3']),
                )
            })

            it('should return the list of recipients to notify excluding user1 and user3 who are in mutedUsersInChannel', async () => {
                const { notificationData, channelId, taggedUsers } = setupMockData()
                getMutedUsersInChannelMock.mockResolvedValue([
                    { UserId: 'user1' },
                    { UserId: 'user3' },
                ])

                const result = await notificationService.getUsersToNotify(
                    notificationData,
                    channelId,
                    taggedUsers,
                )

                const expected: NotifyUser[] = []
                expected.push({ userId: 'user2', kind: NotificationKind.ReplyTo })
                expect(result).toEqual(expected)
                expect(getMutedReplyToUsersMock).toHaveBeenCalledWith(
                    expect.arrayContaining(['user2']),
                )
            })

            it('should return the list of recipients to notify excluding user1 who is in mutedReplyToUsers', async () => {
                const { notificationData, channelId, taggedUsers } = setupMockData()
                getMutedReplyToUsersMock.mockResolvedValue([{ UserId: 'user1' }])

                const result = await notificationService.getUsersToNotify(
                    notificationData,
                    channelId,
                    taggedUsers,
                )

                const expected: NotifyUser[] = []
                expected.push({ userId: 'user2', kind: NotificationKind.ReplyTo })
                expected.push({ userId: 'user3', kind: NotificationKind.ReplyTo })
                expect(result).toEqual(expected)
                expect(getMutedReplyToUsersMock).toHaveBeenCalledWith(
                    expect.arrayContaining(['user2', 'user3']),
                )
            })

            it('should return the list of recipients to notify even though all user are in mutedMentionUsers', async () => {
                const { notificationData, channelId, taggedUsers } = setupMockData()
                getMutedMentionUsersMock.mockResolvedValue([
                    { UserId: 'user1' },
                    { UserId: 'user2' },
                    { UserId: 'user3' },
                ])

                const result = await notificationService.getUsersToNotify(
                    notificationData,
                    channelId,
                    taggedUsers,
                )

                const expected: NotifyUser[] = []
                expected.push({ userId: 'user1', kind: NotificationKind.ReplyTo })
                expected.push({ userId: 'user2', kind: NotificationKind.ReplyTo })
                expected.push({ userId: 'user3', kind: NotificationKind.ReplyTo })
                expect(result).toEqual(expected)
                expect(getMutedReplyToUsersMock).toHaveBeenCalledWith(
                    expect.arrayContaining(['user1', 'user2', 'user3']),
                )
            })
        })

        describe('Tag: DirectMessage', () => {
            const setupMockData = () => {
                return {
                    notificationData: {
                        users: ['user1', 'user2', 'user3'],
                        payload: {
                            content: {
                                kind: NotificationKind.DirectMessage,
                                spaceId: 'space123',
                                channelId: 'channel123',
                                senderId: 'user4',
                            },
                        },
                        receipients: [],
                        sender: 'user4',
                    } as unknown as NotifyUsersSchema,
                    channelId: 'channel123',
                    taggedUsers: [
                        {
                            UserId: 'user1',
                            Tag: NotificationKind.DirectMessage,
                            SpaceId: 'space123',
                            ChannelId: 'channel123',
                        },
                        {
                            UserId: 'user2',
                            Tag: NotificationKind.DirectMessage,
                            SpaceId: 'space123',
                            ChannelId: 'channel123',
                        },
                        {
                            UserId: 'user3',
                            Tag: NotificationKind.DirectMessage.toString(),
                            SpaceId: 'space123',
                            ChannelId: 'channel123',
                        },
                    ],
                }
            }

            it('should return the list of recipients to notify', async () => {
                const { notificationData, channelId, taggedUsers } = setupMockData()

                const result = await notificationService.getUsersToNotify(
                    notificationData,
                    channelId,
                    taggedUsers,
                )

                const expected: NotifyUser[] = []
                expected.push({ userId: 'user1', kind: NotificationKind.DirectMessage })
                expected.push({ userId: 'user2', kind: NotificationKind.DirectMessage })
                expected.push({ userId: 'user3', kind: NotificationKind.DirectMessage })
                expect(result).toEqual(expected)
                expect(getMutedDirectMessageUsersMock).toHaveBeenCalledWith(
                    expect.arrayContaining(['user1', 'user2', 'user3']),
                )
            })

            it('should return the list of recipients even though user2 is not tagged', async () => {
                const { notificationData, channelId, taggedUsers } = setupMockData()

                const result = await notificationService.getUsersToNotify(
                    notificationData,
                    channelId,
                    taggedUsers.filter((user) => user.UserId !== 'user2'),
                )

                const expected: NotifyUser[] = []
                expected.push({ userId: 'user1', kind: NotificationKind.DirectMessage })
                expected.push({ userId: 'user2', kind: NotificationKind.DirectMessage })
                expected.push({ userId: 'user3', kind: NotificationKind.DirectMessage })
                expect(result).toEqual(expected)
                expect(getMutedDirectMessageUsersMock).toHaveBeenCalledWith(
                    expect.arrayContaining(['user1', 'user2', 'user3']),
                )
            })

            it('should return the list of recipients to notify even though user1 and user3 are in mutedUsersInChannel', async () => {
                const { notificationData, channelId, taggedUsers } = setupMockData()
                getMutedUsersInChannelMock.mockResolvedValue([
                    { UserId: 'user1' },
                    { UserId: 'user3' },
                ])

                const result = await notificationService.getUsersToNotify(
                    notificationData,
                    channelId,
                    taggedUsers,
                )

                const expected: NotifyUser[] = []
                expected.push({ userId: 'user1', kind: NotificationKind.DirectMessage })
                expected.push({ userId: 'user2', kind: NotificationKind.DirectMessage })
                expected.push({ userId: 'user3', kind: NotificationKind.DirectMessage })
                expect(result).toEqual(expected)
                expect(getMutedDirectMessageUsersMock).toHaveBeenCalledWith(
                    expect.arrayContaining(['user1', 'user2', 'user3']),
                )
            })

            it('should return the list of recipients to notify excluding user1 who is in mutedDirectMessageUsers', async () => {
                const { notificationData, channelId, taggedUsers } = setupMockData()
                getMutedDirectMessageUsersMock.mockResolvedValue([{ UserId: 'user1' }])

                const result = await notificationService.getUsersToNotify(
                    notificationData,
                    channelId,
                    taggedUsers,
                )

                const expected: NotifyUser[] = []
                expected.push({ userId: 'user2', kind: NotificationKind.DirectMessage })
                expected.push({ userId: 'user3', kind: NotificationKind.DirectMessage })
                expect(result).toEqual(expected)
                expect(getMutedDirectMessageUsersMock).toHaveBeenCalledWith(
                    expect.arrayContaining(['user2', 'user3']),
                )
            })

            it('should return the list of recipients to notify even though all user are in mutedMentionUsers', async () => {
                const { notificationData, channelId, taggedUsers } = setupMockData()
                getMutedMentionUsersMock.mockResolvedValue([
                    { UserId: 'user1' },
                    { UserId: 'user2' },
                    { UserId: 'user3' },
                ])

                const result = await notificationService.getUsersToNotify(
                    notificationData,
                    channelId,
                    taggedUsers,
                )

                const expected: NotifyUser[] = []
                expected.push({ userId: 'user1', kind: NotificationKind.DirectMessage })
                expected.push({ userId: 'user2', kind: NotificationKind.DirectMessage })
                expected.push({ userId: 'user3', kind: NotificationKind.DirectMessage })
                expect(result).toEqual(expected)
                expect(getMutedDirectMessageUsersMock).toHaveBeenCalledWith(
                    expect.arrayContaining(['user1', 'user2', 'user3']),
                )
            })
        })

        describe('Tag: AtChannel', () => {
            it('should return the list of all users in the channel as recipients to notify when Notification Tag holds the tag AtChannel', async () => {
                const notificationData = {
                    users: ['user1', 'user2', 'user3'],
                    payload: {
                        content: {
                            kind: NotificationKind.AtChannel,
                            spaceId: 'space123',
                            channelId: 'channel123',
                        },
                    },
                } as NotifyUsersSchema

                const channelId = 'channel123'
                const taggedUsers = [
                    {
                        UserId: NotificationKind.AtChannel,
                        Tag: NotificationKind.AtChannel,
                        SpaceId: 'space123',
                        ChannelId: 'channel123',
                    },
                ]

                const result = await notificationService.getUsersToNotify(
                    notificationData,
                    channelId,
                    taggedUsers,
                )

                const expected: NotifyUser[] = []
                expected.push({ userId: 'user1', kind: NotificationKind.AtChannel })
                expected.push({ userId: 'user2', kind: NotificationKind.AtChannel })
                expected.push({ userId: 'user3', kind: NotificationKind.AtChannel })
                expect(result).toEqual(expected)
            })
        })

        describe('Tag: Attachment', () => {
            it('should return the list of all users in the channel as recipients to notify when Notification Tag holds the userId as AtChannel and Tag as NotificationAttachmentKind', async () => {
                const channelId = `${StreamPrefix.Channel}channel123`
                const notificationData = {
                    users: ['user1', 'user2', 'user3', 'user4'],
                    payload: {
                        content: {
                            kind: NotificationKind.NewMessage,
                            spaceId: 'space123',
                            channelId,
                            senderId: 'user4',
                        },
                    },
                    sender: 'user4',
                } as NotifyUsersSchema

                const taggedUsers = [
                    {
                        UserId: NotificationKind.AtChannel,
                        Tag: NotificationAttachmentKind.File,
                        SpaceId: 'space123',
                        ChannelId: channelId,
                    },
                ]

                const result = await notificationService.getUsersToNotify(
                    notificationData,
                    channelId,
                    taggedUsers,
                )

                const expected: NotifyUser[] = []
                expected.push({ userId: 'user1', kind: NotificationAttachmentKind.File })
                expected.push({ userId: 'user2', kind: NotificationAttachmentKind.File })
                expected.push({ userId: 'user3', kind: NotificationAttachmentKind.File })
                expect(result).toEqual(expected)
            })

            it('should return the list of selected users as recipients to notify when Notification Tag holds Tag as NotificationAttachmentKind and its a channel', async () => {
                const channelId = `${StreamPrefix.Channel}channel123`
                const notificationData = {
                    users: ['user1', 'user2', 'user3', 'user4'],
                    payload: {
                        content: {
                            kind: NotificationKind.NewMessage,
                            spaceId: 'space123',
                            senderId: 'user4',
                        },
                    },
                    sender: 'user4',
                } as NotifyUsersSchema

                const taggedUsers = [
                    {
                        UserId: 'user2',
                        Tag: NotificationAttachmentKind.Image,
                        SpaceId: 'space123',
                        ChannelId: channelId,
                    },
                    {
                        UserId: 'user3',
                        Tag: NotificationAttachmentKind.Image,
                        SpaceId: 'space123',
                        ChannelId: channelId,
                    },
                ]

                const result = await notificationService.getUsersToNotify(
                    notificationData,
                    channelId,
                    taggedUsers,
                )

                const expected: NotifyUser[] = []
                expected.push({ userId: 'user2', kind: NotificationAttachmentKind.Image })
                expected.push({ userId: 'user3', kind: NotificationAttachmentKind.Image })
                expect(result).toEqual(expected)
            })

            it('should return all users as recipients to notify when Notification Tag holds Tag as NotificationAttachmentKind and its a GDM', async () => {
                const channelId = `${StreamPrefix.DM}dm123`
                const notificationData = {
                    users: ['user1', 'user2', 'user3', 'user4'],
                    payload: {
                        content: {
                            kind: NotificationKind.DirectMessage,
                            channelId,
                            senderId: 'user4',
                            recipients: [],
                            attachmentOnly: NotificationAttachmentKind.Image,
                            event: {},
                        },
                    },
                    sender: 'user4',
                } as NotifyUsersSchema

                const taggedUsers = [
                    {
                        UserId: NotificationKind.AtChannel,
                        Tag: NotificationAttachmentKind.Image,
                        SpaceId: 'space123',
                        ChannelId: channelId,
                    },
                ]

                const result = await notificationService.getUsersToNotify(
                    notificationData,
                    channelId,
                    taggedUsers,
                )

                const expected: NotifyUser[] = []
                expected.push({ userId: 'user1', kind: NotificationAttachmentKind.Image })
                expected.push({ userId: 'user2', kind: NotificationAttachmentKind.Image })
                expected.push({ userId: 'user3', kind: NotificationAttachmentKind.Image })
                expect(result).toEqual(expected)
            })
        })
    })

    describe('createNotificationAsyncRequests', () => {
        const mockPushSubscription = (userId: string) => {
            return {
                UserId: userId,
                PushType: PushType.WebPush,
                PushSubscription: JSON.stringify({
                    endpoint: `https://test.com/webpush/${userId}`,
                    keys: {
                        auth: '-FQZjYtoXi3goOATytC1wQ',
                        p256dh: 'BH-ofVEl85HQ1LrL-IneqnyvfhqL2TH1KHsB0L1cov_cQazLzqOvvX5b7D_zdTgDPg5zd12OE1LWHCMv-ZNazCo',
                    },
                }),
            }
        }

        it('should return an array of push notification promises', async () => {
            const notificationData = {
                users: ['user1', 'user2', 'user3'],
                payload: {
                    content: {
                        kind: NotificationKind.Mention,
                        spaceId: 'space123',
                        channelId: 'channel123',
                    },
                },
            } as NotifyUsersSchema

            const usersToNotify: NotifyUser[] = []
            usersToNotify.push({ userId: 'user1', kind: NotificationKind.Mention })
            usersToNotify.push({ userId: 'user2', kind: NotificationKind.Mention })
            usersToNotify.push({ userId: 'user3', kind: NotificationKind.Mention })

            const pushSubscriptions = [
                mockPushSubscription('user1'),
                mockPushSubscription('user2'),
                mockPushSubscription('user3'),
            ]

            ;(sendNotificationViaWebPush as jest.Mock).mockImplementation(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (_option, subscription: PushSubscription) => {
                    return Promise.resolve({
                        userId: subscription.UserId,
                        pushSubscription: subscription.PushSubscription,
                        status: SendPushStatus.Success,
                    })
                },
            )
            ;(database.pushSubscription.findMany as jest.Mock).mockImplementation(
                ({ where: { UserId } }) => {
                    const sub = pushSubscriptions.filter((sub) => sub.UserId === UserId)
                    return sub
                },
            )

            const result = await notificationService.createNotificationAsyncRequests(
                notificationData,
                usersToNotify,
            )

            expect(result).toHaveLength(3)
            expect(database.pushSubscription.findMany).toHaveBeenCalledTimes(3)
            expect(sendNotificationViaWebPush).toHaveBeenCalledTimes(3)
        })
    })

    describe('dispatchAllPushNotification', () => {
        it('should handle the results of push notifications', async () => {
            const pushNotificationRequests = [
                Promise.resolve({
                    status: SendPushStatus.Success,
                    userId: 'user1',
                    pushSubscription: 'subscription1',
                }),
                Promise.resolve({
                    status: SendPushStatus.Error,
                    userId: 'user2',
                    pushSubscription: 'subscription2',
                    message: 'error 2',
                }),
                Promise.resolve({
                    status: SendPushStatus.Error,
                    userId: 'user3',
                    pushSubscription: 'subscription3',
                    message: 'error 3',
                }),
            ]

            ;(database.pushSubscription.delete as jest.Mock).mockResolvedValue(undefined)

            const result = await notificationService.dispatchAllPushNotification(
                pushNotificationRequests,
            )

            expect(result).toBe(1)
            expect(database.pushSubscription.delete).toHaveBeenCalledTimes(2)
        })
    })

    describe('deleteFailedSubscription', () => {
        it('should delete the failed push subscription', async () => {
            const result: PromiseFulfilledResult<SendPushResponse> = {
                value: {
                    status: SendPushStatus.Error,
                    message: 'Invalid token',
                    userId: 'user1',
                    pushSubscription: 'subscription123',
                },
                status: 'fulfilled',
            }

            ;(database.pushSubscription.delete as jest.Mock).mockResolvedValue(undefined)

            const consoleLogMock = jest.spyOn(console, 'log')
            consoleLogMock.mockImplementation(() => {})

            await notificationService.deleteFailedSubscription(result)

            expect(database.pushSubscription.delete).toHaveBeenCalledWith({
                where: {
                    UserId: result.value.userId,
                    PushSubscription: result.value.pushSubscription,
                },
            })
        })
    })
})
