import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { database } from '../../infrastructure/database/prisma'
import { logger } from '../logger'
import {
    DeleteUserSettingsSchema,
    GetUserSettingsSchema,
    SaveUserSettingsSchema,
    PatchUserSettingsSchema,
} from '../../types'
import { Prisma, UserSettings } from '@prisma/client'

let StreamsMonitorService:
    | { instance: { addNewStreamsToDB: (arg0: Set<string>) => void } }
    | undefined
;(async () => {
    if (process.env.NODE_ENV !== 'test') {
        StreamsMonitorService = await import('../services/stream/streamsMonitorService').then(
            (module) => module.StreamsMonitorService,
        )
    }
})()

export async function saveNotificationSettingsHandler(req: Request, res: Response) {
    const payload: SaveUserSettingsSchema = req.body
    const { userSettings } = payload
    const { userId } = userSettings

    await database.$transaction(async (tx) => {
        try {
            const userSettingsData = {
                UserId: userId,
                DirectMessage: userSettings.directMessage,
                Mention: userSettings.mention,
                ReplyTo: userSettings.replyTo,
            }

            await upsertUserSettings(tx, userSettingsData)
            await upsertChannelAndSpaceSettings(tx, userSettings, userId)
            return
        } catch (e) {
            logger.error('saveSettings error', e)
            return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ error: 'Invalid data' })
        }
    })

    return res.status(StatusCodes.OK).json(userSettings)
}

export async function deleteNotificationSettingsHandler(req: Request, res: Response) {
    const deleteParams: DeleteUserSettingsSchema = req.body
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
    const getNotificationParams: GetUserSettingsSchema = req.body
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

export async function patchNotificationSettingsHandler(req: Request, res: Response) {
    const payload: PatchUserSettingsSchema = req.body
    const { userSettings } = payload
    const { userId } = userSettings

    const dbUserSettings = await database.userSettings.findUnique({ where: { UserId: userId } })
    if (!dbUserSettings) {
        return res.status(StatusCodes.NOT_FOUND).json({ error: 'User settings not found' })
    }

    const userSettingsData = {
        UserId: userId,
        DirectMessage: userSettings.directMessage ?? dbUserSettings.DirectMessage,
        ReplyTo: userSettings.replyTo ?? dbUserSettings.ReplyTo,
        Mention: userSettings.mention ?? dbUserSettings.Mention,
    }

    try {
        await database.$transaction(async (tx) => {
            const channelAndSpaceSettings: Pick<
                SaveUserSettingsSchema['userSettings'],
                'spaceSettings' | 'channelSettings'
            > = {
                spaceSettings: userSettings.spaceSettings ?? [],
                channelSettings: userSettings.channelSettings ?? [],
            }
            const isUserSettingsModified =
                userSettings.directMessage !== undefined ||
                userSettings.replyTo !== undefined ||
                userSettings.mention !== undefined

            await upsertChannelAndSpaceSettings(tx, channelAndSpaceSettings, userId)
            if (isUserSettingsModified) {
                await upsertUserSettings(tx, userSettingsData)
            }
        })
    } catch (e) {
        logger.error('updateSettings error', e)
        return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ error: 'Invalid data' })
    }

    return res.status(StatusCodes.OK).json(userSettings)
}

async function upsertChannelAndSpaceSettings(
    tx: Prisma.TransactionClient,
    userSettings: Pick<SaveUserSettingsSchema['userSettings'], 'spaceSettings' | 'channelSettings'>,
    userId: string,
) {
    const channelIds: Set<string> = new Set()
    const upserts = []

    // upsert space settings
    for (const spaceSettings of userSettings.spaceSettings) {
        upserts.push(
            tx.userSettingsSpace.upsert({
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
            }),
        )
    }

    // upsert channel settings
    for (const channelSettings of userSettings.channelSettings) {
        channelIds.add(channelSettings.channelId)
        const newSettings = {
            SpaceId: channelSettings.spaceId,
            ChannelId: channelSettings.channelId,
            UserId: userId,
            ChannelMute: channelSettings.channelMute,
        }
        upserts.push(
            tx.userSettingsChannel.upsert({
                where: {
                    ChannelId_UserId: {
                        ChannelId: newSettings.ChannelId,
                        UserId: userId,
                    },
                },
                update: { ChannelMute: newSettings.ChannelMute },
                create: newSettings,
            }),
        )
    }

    await Promise.all(upserts)

    if (channelIds.size > 0 && StreamsMonitorService) {
        StreamsMonitorService.instance.addNewStreamsToDB(channelIds)
    }
}

async function upsertUserSettings(tx: Prisma.TransactionClient, userSettingsData: UserSettings) {
    return tx.userSettings.upsert({
        where: { UserId: userSettingsData.UserId },
        update: userSettingsData,
        create: userSettingsData,
    })
}
