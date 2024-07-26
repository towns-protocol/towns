import {
    DeleteUserSettingsSchema,
    GetUserSettingsSchema,
    PatchUserSettingsSchema,
    SaveUserSettingsSchema,
} from '../../types'
import { Prisma, UserSettings } from '@prisma/client'
import { Request, Response } from 'express'

import { StatusCodes } from 'http-status-codes'
import { database } from '../prisma'
import { StreamsMonitorService } from '../services/stream/streamsMonitorService'

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
                BlockedUsers: userSettings.blockedUsers,
            }

            await upsertUserSettings(tx, userSettingsData)
            await upsertChannelAndSpaceSettings(tx, userSettings, userId)
            return
        } catch (e) {
            req.logger.error('saveSettings error', e)
            res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ error: 'Invalid data' })
            return
        }
    })

    res.status(StatusCodes.OK).json(userSettings)
    return
}

export async function deleteNotificationSettingsHandler(req: Request, res: Response) {
    const deleteParams: DeleteUserSettingsSchema = req.body
    const { userId } = deleteParams

    try {
        await database.userSettings.delete({ where: { UserId: userId } })
        res.sendStatus(StatusCodes.NO_CONTENT)
        return
    } catch (e) {
        req.logger.error('deleteSettings error', e)
    }

    res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ error: 'Invalid data' })
    return
}

export async function getNotificationSettingsHandler(req: Request, res: Response) {
    req.logger.info('getNotificationSettings', req.body)

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
            res.status(StatusCodes.NOT_FOUND).json({ error: 'User settings not found' })
            return
        }

        res.status(StatusCodes.OK).json({
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
            blockedUsers: userSettings.BlockedUsers,
        })
        return
    } catch (e) {
        req.logger.error('getSettings error', e)
    }

    res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ error: 'Invalid data' })
    return
}

export async function patchNotificationSettingsHandler(req: Request, res: Response) {
    const payload: PatchUserSettingsSchema = req.body
    const { userSettings } = payload
    const { userId } = userSettings

    const dbUserSettings = await database.userSettings.findUnique({ where: { UserId: userId } })
    if (!dbUserSettings) {
        res.status(StatusCodes.NOT_FOUND).json({ error: 'User settings not found' })
        return
    }

    const userSettingsData = {
        UserId: userId,
        DirectMessage: userSettings.directMessage ?? dbUserSettings.DirectMessage,
        ReplyTo: userSettings.replyTo ?? dbUserSettings.ReplyTo,
        Mention: userSettings.mention ?? dbUserSettings.Mention,
        BlockedUsers: userSettings.blockedUsers ?? dbUserSettings.BlockedUsers,
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
        req.logger.error('updateSettings error', e)
        res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ error: 'Invalid data' })
        return
    }

    res.status(StatusCodes.OK).json(userSettings)
    return
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
                    UserId_SpaceId: {
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
                    UserId_ChannelId: {
                        UserId: userId,
                        ChannelId: channelSettings.channelId,
                    },
                },
                update: { ChannelMute: newSettings.ChannelMute },
                create: newSettings,
            }),
        )
    }

    await Promise.all(upserts)

    if (channelIds.size > 0) {
        await StreamsMonitorService.instance.addNewStreamsToDB(channelIds)
    }
}

async function upsertUserSettings(tx: Prisma.TransactionClient, userSettingsData: UserSettings) {
    return tx.userSettings.upsert({
        where: { UserId: userSettingsData.UserId },
        update: userSettingsData,
        create: userSettingsData,
    })
}
