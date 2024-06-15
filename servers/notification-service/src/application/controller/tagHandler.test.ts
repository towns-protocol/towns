import './../utils/envs.mock'

import { Request, Response } from 'express'

import { StatusCodes } from 'http-status-codes'
import { database } from '../prisma'
import { tagHandler } from './tagHandler'
import { NotificationAttachmentKind, NotificationKind } from '../tagSchema'
import { logger } from '../logger'

jest.mock('./../prisma', () => ({
    database: {
        notificationTag: {
            upsert: jest.fn(),
        },
    },
}))

describe('tagHandler', () => {
    let req: Request
    let res: Response

    beforeEach(() => {
        req = {
            body: [
                {
                    channelId: 'channel123',
                    spaceId: 'space123',
                    userIds: ['user1', 'user2', 'user3'],
                    tag: NotificationKind.Mention,
                },
            ],
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
            ChannelId: req.body[0].channelId,
            Tag: NotificationKind.Mention,
            SpaceId: req.body[0].spaceId,
        }

        await tagHandler(req, res)

        expect(database.notificationTag.upsert).toHaveBeenCalled()
        for (const UserId of req.body[0].userIds) {
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
        expect(res.json).toHaveBeenCalledWith(req.body)
    })

    it('should tag mention users (with threadId)', async () => {
        req = {
            body: [
                {
                    channelId: 'channel123',
                    userIds: ['user1', 'user2', 'user3'],
                    threadId: 'thread123',
                    tag: NotificationKind.Mention,
                },
            ],
        } as unknown as Request
        const tagData = {
            ChannelId: req.body[0].channelId,
            Tag: NotificationKind.Mention,
            SpaceId: req.body[0].spaceId,
            ThreadId: 'thread123',
        }

        await tagHandler(req, res)

        expect(database.notificationTag.upsert).toHaveBeenCalled()
        for (const UserId of req.body[0].userIds) {
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
        expect(res.json).toHaveBeenCalledWith(req.body)
    })

    it('should tag @channel', async () => {
        req = {
            body: [
                {
                    channelId: 'channel123',
                    spaceId: 'space123',
                    tag: NotificationKind.AtChannel,
                },
            ],
        } as unknown as Request
        const tagData = {
            ChannelId: req.body[0].channelId,
            Tag: NotificationKind.AtChannel,
            SpaceId: req.body[0].spaceId,
            UserId: NotificationKind.AtChannel,
        }

        await tagHandler(req, res)

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
        expect(res.json).toHaveBeenCalledWith(req.body)
    })

    it('should tag attachment only', async () => {
        req = {
            body: [
                {
                    channelId: 'channel123',
                    spaceId: 'space123',
                    tag: NotificationAttachmentKind.File,
                    userIds: ['user1'],
                },
            ],
        } as unknown as Request
        const tagData = {
            ChannelId: req.body[0].channelId,
            Tag: NotificationAttachmentKind.File,
            SpaceId: req.body[0].spaceId,
            UserId: 'user1',
        }

        await tagHandler(req, res)

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
        expect(res.json).toHaveBeenCalledWith(req.body)
    })

    it('should tag reaction', async () => {
        req = {
            body: [
                {
                    channelId: 'channel123',
                    userIds: ['user1'],
                    tag: NotificationKind.Reaction,
                },
            ],
        } as unknown as Request
        const tagData = {
            ChannelId: req.body[0].channelId,
            Tag: NotificationKind.Reaction,
            SpaceId: undefined,
            ThreadId: undefined,
            UserId: req.body[0].userIds[0],
        }

        await tagHandler(req, res)

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
        expect(res.json).toHaveBeenCalledWith(req.body)
    })

    it('should tag reaction (with threadId)', async () => {
        req = {
            body: [
                {
                    channelId: 'channel123',
                    userIds: ['user1'],
                    threadId: 'thread123',
                    tag: NotificationKind.Reaction,
                },
            ],
        } as unknown as Request
        const tagData = {
            ChannelId: req.body[0].channelId,
            Tag: NotificationKind.Reaction,
            SpaceId: undefined,
            UserId: req.body[0].userIds[0],
            ThreadId: req.body[0].threadId,
        }

        await tagHandler(req, res)

        expect(database.notificationTag.upsert).toHaveBeenCalledWith({
            where: {
                ChannelId_UserId: {
                    ChannelId: tagData.ChannelId,
                    UserId: tagData.UserId,
                },
            },
            update: {
                Tag: tagData.Tag,
                ThreadId: req.body[0].threadId,
            },
            create: { ...tagData },
        })

        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
        expect(res.json).toHaveBeenCalledWith(req.body)
    })

    it('should tag multiple tags', async () => {
        req = {
            body: [
                {
                    channelId: 'channel123',
                    spaceId: 'space123',
                    userIds: ['user1', 'user2', 'user3'],
                    tag: NotificationKind.Mention,
                },
                {
                    channelId: 'channel123',
                    spaceId: 'space123',
                    tag: NotificationKind.AtChannel,
                },
            ],
        } as unknown as Request

        await tagHandler(req, res)

        expect(database.notificationTag.upsert).toHaveBeenCalledTimes(4)
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
        expect(res.json).toHaveBeenCalledWith(req.body)
    })

    it('should handle error and return UNPROCESSABLE ENTITY (422) status', async () => {
        const error = new Error('Invalid data')
        jest.spyOn(logger, 'error').mockImplementation(() => logger)
        ;(database.notificationTag.upsert as jest.Mock).mockRejectedValue(error)

        await tagHandler(req, res)

        expect(res.status).toHaveBeenCalledWith(StatusCodes.UNPROCESSABLE_ENTITY)
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid data' })
    })
})
