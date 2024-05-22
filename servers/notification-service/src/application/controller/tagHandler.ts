import { Request, Response } from 'express'

import { StatusCodes } from 'http-status-codes'
import { database } from '../prisma'
import { logger } from '../logger'
import { NotificationAttachmentKind, NotificationKind } from '../tagSchema'

export async function tagMentionUsersHandler(request: Request, res: Response) {
    const tagData = {
        ...request.body,
        tag: NotificationKind.Mention,
    }

    await upsertNotificationTags(tagData, res)
}

export async function tagReplyUserHandler(request: Request, res: Response) {
    const tagData = {
        ...request.body,
        tag: NotificationKind.ReplyTo,
    }

    await upsertNotificationTags(tagData, res)
}

export async function tagAtChannelHandler(request: Request, res: Response) {
    const tagData = {
        ...request.body,
        tag: NotificationKind.AtChannel,
        userIds: [NotificationKind.AtChannel],
    }

    await upsertNotificationTags(tagData, res)
}

export async function tagAttachmentHandler(request: Request, res: Response) {
    const tagData = {
        ...request.body,
    }

    await upsertNotificationTags(tagData, res)
}

export async function tagReactionHandler(request: Request, res: Response) {
    const tagData = {
        ...request.body,
        tag: NotificationKind.Reaction,
        userIds: [request.body.userId],
    }

    await upsertNotificationTags(tagData, res)
}

export async function upsertNotificationTags(
    data: {
        channelId: string
        tag: NotificationKind | NotificationAttachmentKind
        spaceId: string
        userIds: string[]
        threadId?: string
    },
    res: Response,
) {
    const tagData = {
        ChannelId: data.channelId,
        Tag: data.tag,
        SpaceId: data.spaceId,
        ThreadId: data.threadId,
    }
    const upserts: Promise<unknown>[] = []
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

    let hasError = false
    let userIndex = 0
    const results = await Promise.allSettled(upserts)
    for (const result of results) {
        if (result.status === 'rejected' && result.reason instanceof Error) {
            logger.error('Failed to upsert notification tag', {
                reason: result.reason.message,
                userId: data.userIds[userIndex],
            })
            hasError = true
        }
        userIndex++
    }
    if (hasError) {
        return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ error: 'Invalid data' })
    }
    return res.status(StatusCodes.OK).json(data)
}
