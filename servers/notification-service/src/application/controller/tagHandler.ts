import { Request, Response } from 'express'

import { StatusCodes } from 'http-status-codes'
import { database } from '../../infrastructure/database/prisma'
import { logger } from '../logger'
import { notificationKind } from '../schema/tagSchema'

export async function tagMentionUsersHandler(request: Request, res: Response) {
    const tagData = {
        ...request.body,
        tag: notificationKind.Mention,
    }

    await upsertNotificationTags(tagData, res)
}

export async function tagReplyUserHandler(request: Request, res: Response) {
    const tagData = {
        ...request.body,
        tag: notificationKind.ReplyTo,
    }

    await upsertNotificationTags(tagData, res)
}

export async function upsertNotificationTags(
    data: {
        channelId: string
        tag: notificationKind
        spaceId: string
        userIds: string[]
    },
    res: Response,
) {
    const tagData = {
        ChannelId: data.channelId,
        Tag: data.tag,
        SpaceId: data.spaceId,
    }
    for (const UserId of data.userIds) {
        try {
            await database.notificationTag.upsert({
                where: {
                    ChannelId_UserId: {
                        ChannelId: tagData.ChannelId,
                        UserId: UserId,
                    },
                },
                update: { Tag: tagData.Tag },
                create: {
                    ...tagData,
                    UserId,
                },
            })
        } catch (error) {
            logger.error(error)
            return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ error: 'Invalid data' })
        }
    }
    return res.status(StatusCodes.OK).json(data)
}
