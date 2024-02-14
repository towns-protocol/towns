import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import {
    saveNotificationSettingsHandler,
    deleteNotificationSettingsHandler,
    getNotificationSettingsHandler,
} from './notificationSettingsHandler'
import { database } from '../../infrastructure/database/prisma'
import { Mute } from '@prisma/client'

jest.mock('../../infrastructure/database/prisma', () => ({
    database: {
        $transaction: jest.fn(),
        userSettings: {
            upsert: jest.fn(),
            delete: jest.fn(),
            findUnique: jest.fn(),
        },
        userSettingsSpace: {
            upsert: jest.fn(),
        },
        userSettingsChannel: {
            upsert: jest.fn(),
        },
    },
}))

describe('saveNotificationSettingsHandler', () => {
    let req: Request
    let res: Response

    beforeEach(() => {
        req = {
            body: {
                userSettings: {
                    userId: 'user123',
                    directMessage: true,
                    mention: true,
                    replyTo: true,
                    spaceSettings: [
                        { spaceId: 'space1', spaceMute: true },
                        { spaceId: 'space2', spaceMute: false },
                    ],
                    channelSettings: [
                        { spaceId: 'space1', channelId: 'channel1', channelMute: true },
                        { spaceId: 'space2', channelId: 'channel2', channelMute: false },
                    ],
                },
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

    it('should save notification settings and return 200 OK', async () => {
        ;(database.$transaction as jest.Mock).mockImplementation((callback) => callback(database))

        await saveNotificationSettingsHandler(req, res)

        expect(database.$transaction).toHaveBeenCalled()
        expect(database.userSettings.upsert).toHaveBeenCalled()
        expect(database.userSettingsSpace.upsert).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
        expect(res.json).toHaveBeenCalledWith(req.body.userSettings)
    })

    it('should handle errors and return 422 Unprocessable Entity', async () => {
        const error = new Error('Database error')
        jest.spyOn(database, '$transaction').mockImplementation((callback) => callback(database))
        ;(database.userSettings.upsert as jest.Mock).mockRejectedValue(error)
        jest.spyOn(console, 'error').mockImplementation(() => {})

        await saveNotificationSettingsHandler(req, res)

        expect(database.$transaction).toHaveBeenCalledTimes(1)
        expect(console.error).toHaveBeenCalledWith('saveSettings error', error)
        expect(res.status).toHaveBeenCalledWith(StatusCodes.UNPROCESSABLE_ENTITY)
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid data' })
    })
})

describe('deleteNotificationSettingsHandler', () => {
    let req: Request
    let res: Response

    beforeEach(() => {
        req = {
            body: {
                userId: 'user123',
            },
        } as unknown as Request

        res = {
            status: jest.fn().mockReturnThis(),
            sendStatus: jest.fn(),
            json: jest.fn(),
        } as unknown as Response
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('should delete notification settings and return 204 No Content', async () => {
        await deleteNotificationSettingsHandler(req, res)

        expect(database.userSettings.delete).toHaveBeenCalledTimes(1)
        expect(database.userSettings.delete).toHaveBeenCalledWith({
            where: { UserId: req.body.userId },
        })
        expect(res.sendStatus).toHaveBeenCalledWith(StatusCodes.NO_CONTENT)
    })

    it('should handle errors and return 422 Unprocessable Entity', async () => {
        const error = new Error('Database error')
        ;(database.userSettings.delete as jest.Mock).mockRejectedValueOnce(error)

        await deleteNotificationSettingsHandler(req, res)

        expect(database.userSettings.delete).toHaveBeenCalledTimes(1)
        expect(console.error).toHaveBeenCalledWith('deleteSettings error', error)
        expect(res.status).toHaveBeenCalledWith(StatusCodes.UNPROCESSABLE_ENTITY)
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid data' })
    })
})

describe('getNotificationSettingsHandler', () => {
    let req: Request
    let res: Response

    beforeEach(() => {
        req = {
            body: {
                userId: 'user123',
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

    it('should get notification settings and return 200 OK', async () => {
        const userSettings = {
            UserId: 'user123',
            DirectMessage: true,
            Mention: true,
            ReplyTo: true,
            UserSettingsSpace: [
                { SpaceId: 'space1', SpaceMute: Mute.default },
                { SpaceId: 'space2', SpaceMute: Mute.unmuted },
            ],
            UserSettingsChannel: [
                { SpaceId: 'space1', ChannelId: 'channel1', ChannelMute: Mute.unmuted },
                { SpaceId: 'space2', ChannelId: 'channel2', ChannelMute: Mute.muted },
            ],
        }
        jest.spyOn(database, '$transaction').mockImplementation((callback) => callback(database))
        ;(database.userSettings.findUnique as jest.Mock).mockResolvedValueOnce(userSettings)

        await getNotificationSettingsHandler(req, res)

        expect(database.userSettings.findUnique).toHaveBeenCalledTimes(1)
        expect(database.userSettings.findUnique).toHaveBeenCalledWith({
            where: { UserId: req.body.userId },
            include: {
                UserSettingsSpace: true,
                UserSettingsChannel: true,
            },
        })
        expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
        expect(res.json).toHaveBeenCalledWith({
            userId: 'user123',
            directMessage: true,
            mention: true,
            replyTo: true,
            spaceSettings: [
                { spaceId: 'space1', spaceMute: Mute.default },
                { spaceId: 'space2', spaceMute: Mute.unmuted },
            ],
            channelSettings: [
                { spaceId: 'space1', channelId: 'channel1', channelMute: Mute.unmuted },
                { spaceId: 'space2', channelId: 'channel2', channelMute: Mute.muted },
            ],
        })
    })

    it('should handle errors and return 422 Unprocessable Entity', async () => {
        const error = new Error('Database error')
        ;(database.userSettings.findUnique as jest.Mock).mockRejectedValueOnce(error)

        await getNotificationSettingsHandler(req, res)

        expect(database.userSettings.findUnique).toHaveBeenCalledTimes(1)
        expect(console.error).toHaveBeenCalledWith('getSettings error', error)
        expect(res.status).toHaveBeenCalledWith(StatusCodes.UNPROCESSABLE_ENTITY)
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid data' })
    })

    it('should handle not finding user settings and return 404 not found', async () => {
        ;(database.userSettings.findUnique as jest.Mock).mockResolvedValue(undefined)

        await getNotificationSettingsHandler(req, res)

        expect(database.userSettings.findUnique).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND)
    })
})
