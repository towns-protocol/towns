import { Request, Response } from 'express'
import { NotifyUsersSchema } from '../schema/notificationSchema'
import { database } from '../../infrastructure/database/prisma'
import { notificationService } from '../services/notificationService'
import { SendPushResponse } from '../services/web-push/web-push-types'
import { StatusCodes } from 'http-status-codes'

export async function notifyUsersHandler(req: Request, res: Response) {
    const notificationData: NotifyUsersSchema = req.body
    const ChannelId = notificationData.payload.content.channelId

    database.$transaction(async (tx) => {
        try {
            const taggedUsers = await tx.notificationTag.findMany({
                where: {
                    ChannelId,
                },
            })

            const usersToNotify = notificationData.forceNotify
                ? notificationData.users
                : await notificationService.getUsersToNotify(
                      notificationData,
                      ChannelId,
                      taggedUsers,
                  )

            const pushNotificationRequests: Promise<SendPushResponse>[] =
                await notificationService.createNotificationAsyncRequests(
                    notificationData,
                    usersToNotify,
                    tx,
                )

            const notificationsSentCount = await notificationService.dispatchAllPushNotification(
                pushNotificationRequests,
                tx,
            )

            await tx.notificationTag.deleteMany({
                where: {
                    UserId: {
                        in: taggedUsers.map((taggedUser) => taggedUser.UserId),
                    },
                    ChannelId,
                },
            })

            console.log('notificationsSentCount', notificationsSentCount)
            return res.status(StatusCodes.OK).json(notificationsSentCount.toString())
        } catch (e) {
            console.error('notifyUsersHandler error', e)
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR)
        }
    })
}
