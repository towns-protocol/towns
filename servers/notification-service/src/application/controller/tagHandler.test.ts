import './../utils/envs.mock'

import { Request, Response } from 'express'

import { StatusCodes } from 'http-status-codes'
import { database } from '../../infrastructure/database/prisma'
import { tagMentionUsersHandler } from './tagHandler'
import { NotificationKind } from '../schema/tagSchema'

jest.mock('../../infrastructure/database/prisma', () => ({
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

    it('should handle error and return UNPROCESSABLE ENTITY (422) status', async () => {
        const error = new Error('Invalid data')
        jest.spyOn(console, 'error').mockImplementation(() => {})
        ;(database.notificationTag.upsert as jest.Mock).mockRejectedValue(error)

        await tagMentionUsersHandler(req, res)

        expect(res.status).toHaveBeenCalledWith(StatusCodes.UNPROCESSABLE_ENTITY)
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid data' })
    })
})
