import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { database } from '../../infrastructure/database/prisma'
import {
    deleteUserSettingsSchema,
    getUserSettingsSchema,
    saveUserSettingsSchema,
} from '../schema/notificationSettingsSchema'
import { z } from 'zod'
import { logger } from '../logger'

export async function saveNotificationSettingsHandler(req: Request, res: Response) {
    const payload: z.infer<typeof saveUserSettingsSchema> = req.body
    const { userSettings } = payload
    const { userId } = userSettings

    database.$transaction(async (tx) => {
        try {
            const userSettingsData = {
                UserId: userId,
                DirectMessage: userSettings.directMessage,
                Mention: userSettings.mention,
                ReplyTo: userSettings.replyTo,
            }

            // upsert user settings
            await tx.userSettings.upsert({
                where: { UserId: userSettings.userId },
                update: userSettingsData,
                create: userSettingsData,
            })

            // upsert space settings
            for (const spaceSettings of userSettings.spaceSettings) {
                await tx.userSettingsSpace.upsert({
                    where: {
                        SpaceId_UserId: {
                            SpaceId: spaceSettings.spaceId,
                            UserId: userId,
                        },
                    },
                    update: {
                        SpaceMute: spaceSettings.spaceMute,
                    },
                    create: {
                        SpaceId: spaceSettings.spaceId,
                        UserId: userId,
                        SpaceMute: spaceSettings.spaceMute,
                    },
                })
            }

            // upsert channel settings
            for (const channelSettings of userSettings.channelSettings) {
                const newSettings = {
                    SpaceId: channelSettings.spaceId,
                    ChannelId: channelSettings.channelId,
                    UserId: userId,
                    ChannelMute: channelSettings.channelMute,
                }
                await tx.userSettingsChannel.upsert({
                    where: {
                        ChannelId_UserId: {
                            ChannelId: newSettings.ChannelId,
                            UserId: userId,
                        },
                    },
                    update: { ChannelMute: newSettings.ChannelMute },
                    create: newSettings,
                })
            }
            return
        } catch (e) {
            logger.error('saveSettings error', e)
            return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ error: 'Invalid data' })
        }
    })

    return res.status(StatusCodes.OK).json(userSettings)
}

export async function deleteNotificationSettingsHandler(req: Request, res: Response) {
    const deleteParams: z.infer<typeof deleteUserSettingsSchema> = req.body
    const { userId } = deleteParams

    try {
        await database.userSettings.delete({ where: { UserId: userId } })
        return res.sendStatus(StatusCodes.NO_CONTENT)
    } catch (e) {
        logger.error('deleteSettings error', e)
    }

    return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ error: 'Invalid data' })
}

export async function getNotificationSettingsHandler(req: Request, res: Response) {
    const getNotificationParams: z.infer<typeof getUserSettingsSchema> = req.body
    const { userId } = getNotificationParams

    try {
        const userSettings = await database.userSettings.findUnique({
            where: { UserId: userId },
            include: {
                UserSettingsSpace: true,
                UserSettingsChannel: true,
            },
        })

        if (!userSettings) {
            return res.status(StatusCodes.NOT_FOUND).json({ error: 'User settings not found' })
        }

        return res.status(StatusCodes.OK).json({
            userId,
            directMessage: userSettings.DirectMessage,
            mention: userSettings.Mention,
            replyTo: userSettings.ReplyTo,
            spaceSettings: (userSettings.UserSettingsSpace ?? []).map((s) => ({
                spaceId: s.SpaceId,
                spaceMute: s.SpaceMute,
            })),
            channelSettings: (userSettings.UserSettingsChannel ?? []).map((c) => ({
                spaceId: c.SpaceId,
                channelId: c.ChannelId,
                channelMute: c.ChannelMute,
            })),
        })
    } catch (e) {
        logger.error('getSettings error', e)
    }

    return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ error: 'Invalid data' })
}
