import { Request, Response } from 'express'

import { StatusCodes } from 'http-status-codes'
import { database } from '../prisma'
import { logger } from '../logger'
import { NotificationKind, TagSchema } from '../tagSchema'

export async function tagHandler(request: Request, res: Response) {
    const tagData = request.body as TagSchema

    const upserts: Promise<unknown>[] = []
    for (const data of tagData) {
        if (!data.userIds) {
            data.userIds = []
        }
        const tagData = {
            ChannelId: data.channelId,
            Tag: data.tag,
            SpaceId: data.spaceId,
            ThreadId: data.threadId,
        }

        if (data.tag === NotificationKind.AtChannel) {
            data.userIds.push(NotificationKind.AtChannel)
        }

        for (const UserId of data.userIds) {
            upserts.push(
                database.notificationTag.upsert({
                    where: {
                        ChannelId_UserId: {
                            ChannelId: tagData.ChannelId,
                            UserId: UserId,
                        },
                    },
                    update: { Tag: tagData.Tag, ThreadId: tagData.ThreadId },
                    create: {
                        ...tagData,
                        UserId,
                    },
                }),
            )
        }
    }

    let hasError = false
    const results = await Promise.allSettled(upserts)
    for (const result of results) {
        if (result.status === 'rejected' && result.reason instanceof Error) {
            logger.error('Failed to upsert notification tag', {
                reason: result.reason.message,
            })
            hasError = true
        }
    }
    if (hasError) {
        return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ error: 'Invalid data' })
    }
    return res.status(StatusCodes.OK).json(tagData)
}
