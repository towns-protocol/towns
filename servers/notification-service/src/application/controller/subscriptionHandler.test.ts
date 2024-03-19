import './../utils/envs.mock'
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { addSubscriptionHandler, removeSubscriptionHandler } from './subscriptionHandler'
import { database } from '../../infrastructure/database/prisma'
import { logger } from '../logger'

jest.mock('../../infrastructure/database/prisma', () => ({
    database: {
        pushSubscription: {
            upsert: jest.fn(),
            findUnique: jest.fn(),
            delete: jest.fn(),
        },
    },
}))

describe('addSubscriptionHandler', () => {
    let req: Request
    let res: Response

    beforeEach(() => {
        req = {
            body: {
                userId: 'user123',
                subscriptionObject: {
                    endpoint: 'https://example.com',
                    keys: { p256dh: 'key', auth: 'auth' },
                },
                pushType: 'WebPush',
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

    it('should add a new subscription', async () => {
        const subscription = req.body
        ;(database.pushSubscription.upsert as jest.Mock).mockResolvedValue(subscription)

        await addSubscriptionHandler(req, res)

        expect(database.pushSubscription.upsert).toHaveBeenCalledWith({
            where: { PushSubscription: JSON.stringify(req.body.subscriptionObject) },
            create: {
                UserId: req.body.userId,
                PushSubscription: JSON.stringify(req.body.subscriptionObject),
                PushType: req.body.pushType,
            },
            update: {
                UserId: req.body.userId,
            },
        })
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
        expect(res.json).toHaveBeenCalledWith(subscription)
    })

    it('should handle error and return UNPROCESSABLE_ENTITY status', async () => {
        const error = new Error('Invalid data')
        ;(database.pushSubscription.upsert as jest.Mock).mockRejectedValue(error)
        jest.spyOn(logger, 'error').mockImplementation(() => logger)

        await addSubscriptionHandler(req, res)

        expect(database.pushSubscription.upsert).toHaveBeenCalledWith({
            where: { PushSubscription: JSON.stringify(req.body.subscriptionObject) },
            create: {
                UserId: req.body.userId,
                PushSubscription: JSON.stringify(req.body.subscriptionObject),
                PushType: req.body.pushType,
            },
            update: {
                UserId: req.body.userId,
            },
        })
        expect(logger.error).toHaveBeenCalledWith(error)
        expect(res.status).toHaveBeenCalledWith(StatusCodes.UNPROCESSABLE_ENTITY)
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid data' })
    })
})

describe('removeSubscriptionHandler', () => {
    let req: Request
    let res: Response

    beforeEach(() => {
        req = {
            body: {
                userId: 'user123',
                subscriptionObject: {
                    endpoint: 'https://example.com',
                    keys: { p256dh: 'key', auth: 'auth' },
                },
            },
        } as unknown as Request

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            sendStatus: jest.fn().mockReturnThis(),
        } as unknown as Response
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('should remove an existing subscription', async () => {
        const existingSubscription = { ...req.body }

        ;(database.pushSubscription.findUnique as jest.Mock).mockResolvedValue(existingSubscription)

        await removeSubscriptionHandler(req, res)

        expect(database.pushSubscription.findUnique).toHaveBeenCalledWith({
            where: {
                PushSubscription: JSON.stringify(req.body.subscriptionObject),
                UserId: req.body.userId,
            },
        })

        await removeSubscriptionHandler(req, res)

        expect(res.sendStatus).toHaveBeenCalledWith(StatusCodes.NO_CONTENT)
        expect(database.pushSubscription.delete).toHaveBeenCalledWith({
            where: {
                PushSubscription: JSON.stringify(req.body.subscriptionObject),
                UserId: req.body.userId,
            },
        })
    })

    it('should handle non-existing subscription and return NOT_FOUND status', async () => {
        ;(database.pushSubscription.findUnique as jest.Mock).mockResolvedValue(null)

        await removeSubscriptionHandler(req, res)

        expect(database.pushSubscription.findUnique).toHaveBeenCalledWith({
            where: {
                PushSubscription: JSON.stringify(req.body.subscriptionObject),
                UserId: req.body.userId,
            },
        })
        expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND)
        expect(res.json).toHaveBeenCalledWith({ error: 'Subscription not found' })
    })
})
