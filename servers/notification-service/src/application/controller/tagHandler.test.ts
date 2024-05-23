import './../utils/envs.mock'

import { Request, Response } from 'express'

import { StatusCodes } from 'http-status-codes'
import { database } from '../prisma'
import {
    tagAtChannelHandler,
    tagAttachmentHandler,
    tagMentionUsersHandler,
    tagReactionHandler,
} from './tagHandler'
import { NotificationAttachmentKind, NotificationKind } from '../tagSchema'

jest.mock('./../prisma', () => ({
    database: {
        notificationTag: {
            upsert: jest.fn(),
        },
    },
}))

describe('tagMentionUsersHandler', () => {
    let req: Request
    let res: Response

    beforeEach(() => {
        req = {
            body: {
                channelId: 'channel123',
                spaceId: 'space123',
                userIds: ['user1', 'user2', 'user3'],
            },
        } as unknown as Request

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('should tag mention users', async () => {
        const tagData = {
            ChannelId: req.body.channelId,
            Tag: NotificationKind.Mention,
            SpaceId: req.body.spaceId,
        }

        await tagMentionUsersHandler(req, res)

        expect(database.notificationTag.upsert).toHaveBeenCalled()
        for (const UserId of req.body.userIds) {
            expect(database.notificationTag.upsert).toHaveBeenCalledWith({
                where: {
                    ChannelId_UserId: {
                        ChannelId: tagData.ChannelId,
                        UserId,
                    },
                },
                update: { Tag: tagData.Tag },
                create: { ...tagData, UserId },
            })
        }

        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
        expect(res.json).toHaveBeenCalledWith({
            ...req.body,
            tag: NotificationKind.Mention,
        })
    })

    it('should tag mention users (with threadId)', async () => {
        req = {
            body: {
                channelId: 'channel123',
                userIds: ['user1', 'user2', 'user3'],
                threadId: 'thread123',
            },
        } as unknown as Request
        const tagData = {
            ChannelId: req.body.channelId,
            Tag: NotificationKind.Mention,
            SpaceId: req.body.spaceId,
            ThreadId: 'thread123',
        }

        await tagMentionUsersHandler(req, res)

        expect(database.notificationTag.upsert).toHaveBeenCalled()
        for (const UserId of req.body.userIds) {
            expect(database.notificationTag.upsert).toHaveBeenCalledWith({
                where: {
                    ChannelId_UserId: {
                        ChannelId: tagData.ChannelId,
                        UserId,
                    },
                },
                update: { Tag: tagData.Tag, ThreadId: tagData.ThreadId },
                create: { ...tagData, UserId },
            })
        }

        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
        expect(res.json).toHaveBeenCalledWith({
            ...req.body,
            tag: NotificationKind.Mention,
        })
    })

    it('should tag @channel', async () => {
        req = {
            body: {
                channelId: 'channel123',
                spaceId: 'space123',
            },
        } as unknown as Request
        const tagData = {
            ChannelId: req.body.channelId,
            Tag: NotificationKind.AtChannel,
            SpaceId: req.body.spaceId,
            UserId: NotificationKind.AtChannel,
        }

        await tagAtChannelHandler(req, res)

        expect(database.notificationTag.upsert).toHaveBeenCalled()
        expect(database.notificationTag.upsert).toHaveBeenCalledWith({
            where: {
                ChannelId_UserId: {
                    ChannelId: tagData.ChannelId,
                    UserId: NotificationKind.AtChannel,
                },
            },
            update: { Tag: tagData.Tag },
            create: { ...tagData },
        })

        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
        expect(res.json).toHaveBeenCalledWith({
            ...req.body,
            tag: NotificationKind.AtChannel,
            userIds: [NotificationKind.AtChannel],
        })
    })

    it('should tag attachment only', async () => {
        req = {
            body: {
                channelId: 'channel123',
                spaceId: 'space123',
                tag: NotificationAttachmentKind.File,
                userIds: ['user1'],
            },
        } as unknown as Request
        const tagData = {
            ChannelId: req.body.channelId,
            Tag: NotificationAttachmentKind.File,
            SpaceId: req.body.spaceId,
            UserId: 'user1',
        }

        await tagAttachmentHandler(req, res)

        expect(database.notificationTag.upsert).toHaveBeenCalled()
        expect(database.notificationTag.upsert).toHaveBeenCalledWith({
            where: {
                ChannelId_UserId: {
                    ChannelId: tagData.ChannelId,
                    UserId: tagData.UserId,
                },
            },
            update: { Tag: tagData.Tag },
            create: { ...tagData },
        })

        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
        expect(res.json).toHaveBeenCalledWith({
            ...req.body,
            userIds: [tagData.UserId],
        })
    })

    it('should tag reaction', async () => {
        req = {
            body: {
                channelId: 'channel123',
                userId: 'user1',
            },
        } as unknown as Request
        const tagData = {
            ChannelId: req.body.channelId,
            Tag: NotificationKind.Reaction,
            SpaceId: undefined,
            UserId: req.body.userId,
        }

        await tagReactionHandler(req, res)

        expect(database.notificationTag.upsert).toHaveBeenCalledWith({
            where: {
                ChannelId_UserId: {
                    ChannelId: tagData.ChannelId,
                    UserId: tagData.UserId,
                },
            },
            update: { Tag: tagData.Tag },
            create: { ...tagData },
        })

        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
        expect(res.json).toHaveBeenCalledWith({
            ...req.body,
            tag: NotificationKind.Reaction,
            userIds: [req.body.userId],
            threadId: req.body.threadId,
        })
    })

    it('should tag reaction (with threadId)', async () => {
        req = {
            body: {
                channelId: 'channel123',
                userId: 'user1',
                threadId: 'thread123',
            },
        } as unknown as Request
        const tagData = {
            ChannelId: req.body.channelId,
            Tag: NotificationKind.Reaction,
            SpaceId: undefined,
            UserId: req.body.userId,
            ThreadId: req.body.threadId,
        }

        await tagReactionHandler(req, res)

        expect(database.notificationTag.upsert).toHaveBeenCalledWith({
            where: {
                ChannelId_UserId: {
                    ChannelId: tagData.ChannelId,
                    UserId: tagData.UserId,
                },
            },
            update: {
                Tag: tagData.Tag,
                ThreadId: req.body.threadId,
            },
            create: { ...tagData },
        })

        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
        expect(res.json).toHaveBeenCalledWith({
            ...req.body,
            tag: NotificationKind.Reaction,
            userIds: [req.body.userId],
            threadId: req.body.threadId,
        })
    })

    it('should handle error and return UNPROCESSABLE ENTITY (422) status', async () => {
        const error = new Error('Invalid data')
        jest.spyOn(console, 'error').mockImplementation(() => {})
        ;(database.notificationTag.upsert as jest.Mock).mockRejectedValue(error)

        await tagMentionUsersHandler(req, res)

        expect(res.status).toHaveBeenCalledWith(StatusCodes.UNPROCESSABLE_ENTITY)
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid data' })
    })
})
